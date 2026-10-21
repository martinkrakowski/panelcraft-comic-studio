import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { PgProjectRepository } from '../PgProjectRepository';
import { ComicProject } from '../../../domain/entities/ComicProject';
import type { ComicProjectJSON } from '../../../domain/entities/ComicProjectSerializer';
import { OwnerId } from '../../../domain/value-objects/index';

const databaseUrl = process.env.TEST_DATABASE_URL;

const suite = databaseUrl ? describe : describe.skip;

function makeProject(overrides: Partial<ComicProjectJSON> = {}): ComicProject {
  return ComicProject.fromJSON({
    id: randomUUID(),
    prompt: 'A lonely robot explores the red dunes of Mars',
    panelCount: 2,
    panels: [
      {
        id: randomUUID(),
        prompt: 'Robot standing on a dune',
        status: 'generated',
        generatedImageUrl: 'https://example.com/p1.webp',
      },
      {
        id: randomUUID(),
        prompt: 'Robot watching the sunset',
        status: 'pending',
        generatedImageUrl: null,
      },
    ],
    characterBible: {
      characters: [
        {
          name: 'Rusty',
          role: 'protagonist',
          visual: 'rusty orange robot',
          consistency: 'curious and kind',
        },
      ],
    },
    genres: ['sci-fi'],
    tones: ['hopeful'],
    styleReferences: {
      globalStylePrompt: 'clean vector art',
      moodBoardPreset: 'neon',
      moodBoardImages: ['https://example.com/mood.webp'],
    },
    coverImageUrl: null,
    composedImageUrl: null,
    selectedLayout: 'grid',
    layoutOptions: ['grid', 'stacked'],
    status: 'pending_review',
    createdAt: new Date().toISOString(),
    lastReviewSubmittedAt: null,
    ...overrides,
  });
}

suite('PgProjectRepository', () => {
  let repo: PgProjectRepository;
  let pool: Pool;
  let adminPool: Pool;
  let schemaName: string;

  beforeEach(async () => {
    const url = process.env.TEST_DATABASE_URL!;
    schemaName = `test_${Math.random().toString(36).slice(2, 10)}`;

    adminPool = new Pool({ connectionString: url });
    await adminPool.query(`CREATE SCHEMA ${schemaName}`);

    pool = new Pool({
      connectionString: url,
      options: `-c search_path=${schemaName}`,
    });

    const migrationPath = fileURLToPath(
      new URL('../../../../../../db/migrations/001_init.sql', import.meta.url)
    );
    const migrationSql = readFileSync(migrationPath, 'utf8');
    await pool.query(migrationSql);

    repo = new PgProjectRepository(pool);
  });

  afterEach(async () => {
    await pool.end();
    await adminPool.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
    await adminPool.end();
  });

  it('keeps user_id on update when ownerId is omitted', async () => {
    const owner = OwnerId.create(randomUUID()).value!;
    const project = makeProject();
    await repo.save(project, owner);

    const id = project.getId().getValue();
    expect(await repo.getOwnerId(id)).toBe(owner.getValue());

    const updated = ComicProject.fromJSON({
      ...project.toJSON(),
      status: 'completed',
    });
    await repo.save(updated);

    expect(await repo.getOwnerId(id)).toBe(owner.getValue());
    const loaded = await repo.load(id);
    expect(loaded?.getStatus()).toBe('completed');
  });

  it('loads a project by id and returns null for a missing id', async () => {
    const owner = OwnerId.create(randomUUID()).value!;
    const project = makeProject();
    await repo.save(project, owner);

    const loaded = await repo.load(project.getId().getValue());
    expect(loaded?.getId().getValue()).toBe(project.getId().getValue());
    expect(loaded?.getPrompt().getValue()).toBe(project.getPrompt().getValue());

    const missing = '00000000-0000-0000-0000-000000000000';
    expect(await repo.load(missing)).toBeNull();
    expect(await repo.findById(missing)).toBeNull();
  });

  it('lists all projects via listAll and findAll', async () => {
    const ownerA = OwnerId.create(randomUUID()).value!;
    const ownerB = OwnerId.create(randomUUID()).value!;
    const a = makeProject();
    const b = makeProject();
    await repo.save(a, ownerA);
    await repo.save(b, ownerB);

    const all = await repo.listAll();
    expect(all.map((p) => p.getId().getValue()).sort()).toEqual(
      [a.getId().getValue(), b.getId().getValue()].sort()
    );

    const allViaFindAll = await repo.findAll();
    expect(allViaFindAll).toHaveLength(2);
  });

  it('lists only the projects owned by a user', async () => {
    const owner = OwnerId.create(randomUUID()).value!;
    const other = OwnerId.create(randomUUID()).value!;
    const mine = makeProject();
    const theirs = makeProject();
    await repo.save(mine, owner);
    await repo.save(theirs, other);

    const owned = await repo.listByOwner(owner);
    expect(owned).toHaveLength(1);
    expect(owned[0].getId().getValue()).toBe(mine.getId().getValue());
  });

  it('lists own and shared projects but not other private ones', async () => {
    const alice = OwnerId.create(randomUUID()).value!;
    const bob = OwnerId.create(randomUUID()).value!;
    const carol = OwnerId.create(randomUUID()).value!;

    const aliceProject = makeProject({ genres: ['adventure'] });
    const sharedProject = makeProject();
    const privateProject = makeProject();

    await repo.save(aliceProject, alice);
    await repo.save(sharedProject, bob);
    await repo.save(privateProject, carol);
    await repo.setShared(sharedProject.getId().getValue(), true);

    const summaries = await repo.listVisibleSummaries(alice);
    const ids = summaries.map((s) => s.id).sort();
    expect(ids).toEqual(
      [aliceProject.getId().getValue(), sharedProject.getId().getValue()].sort()
    );
    expect(ids).not.toContain(privateProject.getId().getValue());

    const aliceSummary = summaries.find(
      (s) => s.id === aliceProject.getId().getValue()
    );
    expect(aliceSummary?.genres).toEqual(['adventure']);
  });

  it('toggles sharing state via setShared/getShareState', async () => {
    const owner = OwnerId.create(randomUUID()).value!;
    const project = makeProject();
    await repo.save(project, owner);

    const id = project.getId().getValue();
    expect(await repo.getShareState(id)).toEqual({
      ownerId: owner.getValue(),
      isShared: false,
    });

    await repo.setShared(id, true);
    expect((await repo.getShareState(id))?.isShared).toBe(true);

    await repo.setShared(id, false);
    expect((await repo.getShareState(id))?.isShared).toBe(false);

    expect(
      await repo.getShareState('00000000-0000-0000-0000-000000000000')
    ).toBeNull();
  });

  it('adopts orphan projects and marks them shared', async () => {
    const adopter = OwnerId.create(randomUUID()).value!;
    const existingOwner = OwnerId.create(randomUUID()).value!;

    const orphan = makeProject();
    const owned = makeProject();
    await repo.save(orphan);
    await repo.save(owned, existingOwner);

    const count = await repo.adoptOrphans(adopter);
    expect(count).toBe(1);

    const orphanId = orphan.getId().getValue();
    expect(await repo.getOwnerId(orphanId)).toBe(adopter.getValue());
    expect((await repo.getShareState(orphanId))?.isShared).toBe(true);

    const ownedId = owned.getId().getValue();
    expect(await repo.getOwnerId(ownedId)).toBe(existingOwner.getValue());
    expect((await repo.getShareState(ownedId))?.isShared).toBe(false);
  });

  it('round-trips jsonb panels and text[] genres', async () => {
    const owner = OwnerId.create(randomUUID()).value!;
    const project = makeProject({
      panels: [
        {
          id: randomUUID(),
          prompt: 'First panel',
          status: 'generated',
          generatedImageUrl: 'https://example.com/1.webp',
        },
        {
          id: randomUUID(),
          prompt: 'Second panel',
          status: 'pending',
          generatedImageUrl: null,
        },
      ],
      genres: ['cyberpunk', 'sci-fi'],
      tones: ['dark'],
    });
    await repo.save(project, owner);

    const loaded = await repo.load(project.getId().getValue());
    expect(loaded?.getPanels().map((p) => p.toJSON())).toEqual(
      project.getPanels().map((p) => p.toJSON())
    );
    expect(loaded?.getGenres()).toEqual(['cyberpunk', 'sci-fi']);
    expect(loaded?.getTones()).toEqual(['dark']);
  });
});

import {
  ComicProject,
  Panel,
  CharacterBible,
} from '@panelcraft/comic-project-management';
import {
  ComicProjectId,
  ComicTitle,
  PanelCount,
  PanelId,
  PanelStatus,
} from '@panelcraft/comic-project-management';
import { randomUUID } from 'node:crypto';
import { ValidationError } from '@panelcraft/shared';
import type { RelationalDbPort } from '../ports/out/relational-db.out-port.js';

interface CreateProjectDeps {
  projectRepo: RelationalDbPort;
  /** Owning user id to stamp on the new project (ownership scoping). */
  ownerId?: string;
}

export async function createProject(
  options: {
    prompt: string;
    panelCount: number;
    genres?: string[];
    tones?: string[];
    characterBible?: Record<string, unknown>;
    styleReferences?: {
      globalStylePrompt: string;
      moodBoardPreset: string;
      moodBoardImages: string[];
      artDirectionNotes?: string;
    };
    referenceImagePaths?: string[];
  },
  deps: CreateProjectDeps
): Promise<string> {
  const promptResult = ComicTitle.create(options.prompt);
  if (!promptResult.success) {
    throw new ValidationError(
      promptResult.error?.message || 'Invalid prompt',
      'prompt',
      options.prompt
    );
  }

  const panelCountResult = PanelCount.create(options.panelCount);
  if (!panelCountResult.success) {
    throw new ValidationError(
      panelCountResult.error?.message || 'Invalid panel count',
      'panelCount',
      options.panelCount
    );
  }

  const projectId = randomUUID();
  const projectIdResult = ComicProjectId.create(projectId);
  if (!projectIdResult.success) {
    throw new ValidationError(
      projectIdResult.error?.message || 'Invalid project ID',
      'projectId',
      projectId
    );
  }

  let characterBible: CharacterBible | null = null;
  if (options.characterBible) {
    const bibleResult = CharacterBible.create(options.characterBible);
    if (!bibleResult.success) {
      throw new ValidationError(
        bibleResult.error?.message || 'Invalid character bible',
        'characterBible',
        options.characterBible
      );
    }
    characterBible = bibleResult.value!;
  }

  const panels: Panel[] = Array.from(
    { length: panelCountResult.value!.getValue() },
    (_, i) => {
      const panelIdResult = PanelId.create(`panel-${i}`);
      if (!panelIdResult.success) {
        throw new ValidationError(
          panelIdResult.error?.message || 'Invalid panel ID',
          'panelId',
          `panel-${i}`
        );
      }

      const statusResult = PanelStatus.create('pending');
      if (!statusResult.success) {
        throw new ValidationError(
          statusResult.error?.message || 'Invalid panel status',
          'status',
          'pending'
        );
      }

      return new Panel(panelIdResult.value!, {
        prompt: '',
        status: statusResult.value!,
        generatedImageUrl: null,
      });
    }
  );

  const project = new ComicProject(projectIdResult.value!, {
    prompt: promptResult.value!,
    panelCount: panelCountResult.value!,
    panels,
    characterBible,
    genres: options.genres,
    tones: options.tones,
    styleReferences: options.styleReferences,
    status: 'pending_creation',
    createdAt: new Date().toISOString(),
  });

  await deps.projectRepo.save(project, deps.ownerId);

  return projectId;
}

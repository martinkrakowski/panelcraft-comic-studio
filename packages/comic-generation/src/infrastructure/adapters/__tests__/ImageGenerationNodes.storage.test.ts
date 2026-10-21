import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { interrupt } from '@langchain/langgraph';
import { ComicProject } from '@panelcraft/comic-project-management';
import type { ComicProjectJSON } from '../../../domain/types/ComicProjectJSON';
import type { ComicGraphStateType } from '../../types/ComicGraphState';
import type { ImageGenerationPort } from '../../../application/ports/out/image-generation.out-port';
import type { LLMClientPort } from '../../../application/ports/out/llm-client.out-port';
import type { ObjectStoragePort } from '../../../application/ports/out/object-storage.out-port';
import type { MediaUrlPort } from '../../../application/ports/out/media-url.out-port';
import type { RelationalDbPort } from '../../../application/ports/out/relational-db.out-port';
import type { WorkflowDeps } from '../ComicWorkflowTypes';
import { InMemoryObjectStorage } from '../InMemoryObjectStorage';
import {
  generateCover,
  generatePanel,
  layoutInterrupt,
} from '../ImageGenerationNodes';

// The real module is replaced by vi.mock below; this cast keeps the call-site
// typing simple for the generic interrupt<T>() helper.
const interruptMock = interrupt as unknown as Mock<
  [unknown],
  { selectedLayout: string }
>;

vi.mock('@langchain/langgraph', () => ({
  interrupt: vi.fn(),
}));

const PANEL_BYTES = Buffer.from('generated-panel-webp-bytes');

function makeProject(
  overrides: Partial<ComicProjectJSON> = {}
): ComicProjectJSON {
  return {
    id: 'proj-1',
    prompt: 'A short comic about a space cat',
    panelCount: 1,
    panels: [
      { id: 'panel-0', prompt: 'A cat floating in space', status: 'pending' },
    ],
    coverImageUrl: null,
    selectedLayout: null,
    layoutOptions: [],
    status: 'created',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeState(
  overrides: Partial<ComicGraphStateType> = {}
): ComicGraphStateType {
  return {
    project: makeProject(),
    currentPanelIndex: 0,
    lastFeedback: null,
    threadId: 'thread-1',
    coverImageUrl: undefined,
    layoutOptions: undefined,
    selectedLayout: undefined,
    ...overrides,
  };
}

function makeLogger() {
  const warnings: string[] = [];
  const errors: string[] = [];
  return {
    warnings,
    errors,
    debug: () => {},
    info: () => {},
    warn: (message: string) => {
      warnings.push(message);
    },
    error: (message: string) => {
      errors.push(message);
    },
  };
}

function makeMediaUrls(): MediaUrlPort {
  return { urlFor: (key: string) => `https://media.test/${key}` };
}

type FakeImageGenPort = ImageGenerationPort & {
  generatePanelMock: ReturnType<typeof vi.fn>;
};

function makeImageGenPort(): FakeImageGenPort {
  const generatePanelMock = vi.fn(
    async (_command: {
      prompt: string;
      panelNumber: number;
      styleModifiers?: string;
      referenceImageUrls?: string[];
    }) => 'https://cdn.example.com/panel.png'
  );
  return {
    generateCover: async () => Buffer.from('cover-image-bytes'),
    generatePanel: generatePanelMock,
    generatePreview: async () => Buffer.from('preview-image-bytes'),
    generatePanelMock,
  };
}

function makeLlmClient(): LLMClientPort {
  return {
    call: vi.fn(async () => ({})),
    analyzePrompt: vi.fn(async () => ({
      feedback: '',
      estimatedCharactersCount: 0,
      suggestedGenres: [],
      suggestedTones: [],
    })),
    extractCharacters: vi.fn(async () => ({ characters: [] })),
  };
}

function makeProjectRepo() {
  const saved: ComicProject[] = [];
  return {
    saved,
    save: vi.fn(async (project: ComicProject) => {
      saved.push(project);
    }),
    load: vi.fn(async () => null),
    listAll: vi.fn(async () => []),
    listByOwner: vi.fn(async () => []),
    getOwnerId: vi.fn(async () => null),
    listVisibleSummaries: vi.fn(async () => []),
    getShareState: vi.fn(async () => null),
    setShared: vi.fn(async () => {}),
    adoptOrphans: vi.fn(async () => 0),
  } satisfies RelationalDbPort & { saved: ComicProject[] };
}

function makeFailingStorage(error = new Error('bucket unavailable')): ObjectStoragePort {
  return {
    putNew: vi.fn(async () => {
      throw error;
    }),
    get: vi.fn(async () => null),
    remove: vi.fn(async () => {}),
    listKeys: vi.fn(async () => []),
  };
}

function makeDeps(overrides: Partial<WorkflowDeps> = {}): WorkflowDeps {
  return {
    imageGenPort: makeImageGenPort(),
    llmClient: makeLlmClient(),
    projectRepo: makeProjectRepo(),
    logger: makeLogger(),
    storage: new InMemoryObjectStorage(),
    mediaUrls: makeMediaUrls(),
    ...overrides,
  };
}

beforeEach(() => {
  interruptMock.mockReset();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(PANEL_BYTES, { status: 200 }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('generateCover storage behaviour', () => {
  it('stores the cover under the same key with image/webp', async () => {
    const storage = new InMemoryObjectStorage();
    const imageGenPort = makeImageGenPort();
    const deps = makeDeps({ storage, imageGenPort });

    const result = await generateCover(makeState(), deps);

    expect(result.coverImageUrl).toBe('comics/proj-1/covers/front.webp');
    expect(result.project.coverImageUrl).toBe(
      'comics/proj-1/covers/front.webp'
    );

    const stored = await storage.get('comics/proj-1/covers/front.webp');
    expect(stored).not.toBeNull();
    expect(stored!.contentType).toBe('image/webp');
    expect(stored!.body.equals(Buffer.from('cover-image-bytes'))).toBe(true);
  });

  it('throws after three failed upload attempts, marking the project failed', async () => {
    vi.useFakeTimers();
    try {
      const logger = makeLogger();
      const projectRepo = makeProjectRepo();
      const deps = makeDeps({
        logger,
        projectRepo,
        storage: makeFailingStorage(new Error('bucket unavailable')),
      });

      const pending = generateCover(makeState(), deps);
      // Attach the rejection handler before advancing timers so the expected
      // failure is never observed as an unhandled rejection.
      const expectation = expect(pending).rejects.toThrow('bucket unavailable');
      await vi.advanceTimersByTimeAsync(4000);
      await expectation;

      expect(logger.warnings).toHaveLength(3);
      expect(projectRepo.save).toHaveBeenCalledTimes(1);
      expect(projectRepo.saved[0].getStatus()).toBe('failed');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('generatePanel storage behaviour', () => {
  it('forwards the signed URL and stores the panel under the same key', async () => {
    const storage = new InMemoryObjectStorage();
    const imageGenPort = makeImageGenPort();
    const deps = makeDeps({ storage, imageGenPort });

    const state = makeState({
      currentPanelIndex: 0,
      coverImageUrl: 'comics/proj-1/covers/front.webp',
    });
    const result = await generatePanel(state, deps);

    expect(imageGenPort.generatePanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceImageUrls: [
          'https://media.test/comics/proj-1/covers/front.webp',
        ],
      })
    );

    const stored = await storage.get('comics/proj-1/panels/0.webp');
    expect(stored).not.toBeNull();
    expect(stored!.contentType).toBe('image/webp');
    expect(stored!.body.equals(PANEL_BYTES)).toBe(true);

    expect(result.project.panels![0].generatedImageUrl).toBe(
      'comics/proj-1/panels/0.webp'
    );
    expect(result.currentPanelIndex).toBe(1);
  });

  it('falls back to the remote URL when staging the panel fails', async () => {
    const logger = makeLogger();
    const deps = makeDeps({
      logger,
      storage: makeFailingStorage(new Error('bucket unavailable')),
    });

    const state = makeState({ currentPanelIndex: 0 });
    const result = await generatePanel(state, deps);

    expect(result.project.panels![0].generatedImageUrl).toBe(
      'https://cdn.example.com/panel.png'
    );
    expect(result.currentPanelIndex).toBe(1);
    expect(
      logger.warnings.some((warning) => warning.includes('stage-to-Supabase failed'))
    ).toBe(true);
  });
});

describe('layoutInterrupt media URL behaviour', () => {
  it('passes the media URL to the layout interrupt payload', async () => {
    interruptMock.mockReturnValue({ selectedLayout: '3-panel grid (1x3)' });
    const deps = makeDeps();

    const state = makeState({
      coverImageUrl: 'comics/proj-1/covers/front.webp',
      layoutOptions: ['3-panel grid (1x3)'],
    });
    const result = await layoutInterrupt(state, deps);

    expect(interruptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'layout_selection',
        coverImageUrl: 'https://media.test/comics/proj-1/covers/front.webp',
      })
    );
    expect(result.selectedLayout).toBe('3-panel grid (1x3)');
  });

  it('logs and passes an empty preview URL when mediaUrls.urlFor fails', async () => {
    interruptMock.mockReturnValue({ selectedLayout: '3-panel grid (1x3)' });
    const logger = makeLogger();
    const deps = makeDeps({
      logger,
      mediaUrls: {
        urlFor: () => {
          throw new Error('sign failed');
        },
      },
    });

    const state = makeState({
      coverImageUrl: 'comics/proj-1/covers/front.webp',
    });
    await layoutInterrupt(state, deps);

    expect(logger.warnings.some((warning) => warning.includes('layout preview'))).toBe(
      true
    );
    const payload = interruptMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.coverImageUrl).toBe('');
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock @panelcraft/ui with all required components
vi.mock('@panelcraft/ui', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  SelectionChip: ({ label, onDismiss, ...props }: any) => (
    <div data-testid="selection-chip" {...props}>
      {label}
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
  Textarea: ({ register, placeholder, ...props }: any) => (
    <textarea {...register} placeholder={placeholder} {...props} />
  ),
  useToast: () => ({ toast: vi.fn() }),
  WizardSidebar: ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  CollapsibleSection: ({ children, title, defaultOpen: _defaultOpen, ...props }: any) => (
    <div {...props}>
      <h3>{title}</h3>
      {children}
    </div>
  ),
  LayoutPreview: ({ layout }: any) => (
    <div data-testid="layout-preview">{layout?.name}</div>
  ),
  AppCanvasCenter: ({ children, className }: any) => (
    <div data-testid="app-canvas-center" className={className}>
      {children}
    </div>
  ),
  AppCanvasTwoPane: ({ sidebar, topStrip, children, clearHeader }: any) => (
    <div data-testid="app-canvas-two-pane" data-clear-header={String(clearHeader)}>
      <div data-testid="sidebar-slot">{sidebar}</div>
      <div data-testid="topstrip-slot">{topStrip}</div>
      <div data-testid="children-slot">{children}</div>
    </div>
  ),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  Sparkles: () => <svg data-testid="sparkles-icon" />,
  ArrowLeft: () => <svg data-testid="arrow-left-icon" />,
  Loader2: () => <svg data-testid="loader-icon" />,
  Layers: () => <svg data-testid="layers-icon" />,
  Plus: () => <svg data-testid="plus-icon" />,
  Trash2: () => <svg data-testid="trash-icon" />,
  PenSquare: () => <svg data-testid="pen-icon" />,
  ImagePlus: () => <svg data-testid="image-plus-icon" />,
  ChevronRight: () => <svg data-testid="chevron-right-icon" />,
  Check: () => <svg data-testid="check-icon" />,
}));

vi.mock('../NewComicWizard.module.css', () => ({
  default: {},
}));

vi.mock('../LayoutPreview', () => ({
  LayoutPreview: () => <div data-testid="layout-preview" />,
}));

vi.mock('../../../lib/api', () => ({
  default: {
    analyzePrompt: vi.fn().mockResolvedValue({
      suggestedGenres: ['Fantasy'],
      suggestedTones: ['Epic'],
      feedback: 'Great prompt!',
    }),
  },
}));

vi.mock('../../../lib/indexedDB', () => {
  const getWizardState = vi.fn().mockResolvedValue(null);
  const setWizardState = vi.fn().mockResolvedValue(undefined);
  return {
    getWizardState,
    setWizardState,
    clearWizardState: vi.fn(),
    IndexedDBQuotaExceededError: class IndexedDBQuotaExceededError extends Error {},
  };
});

vi.mock('../../../lib/hooks/useCreateProject', () => ({
  useCreateProject: () => ({
    createProject: vi
      .fn()
      .mockResolvedValue({ projectId: 'test-123', status: 'processing' }),
    selectLayout: vi.fn(),
    loading: false,
  }),
}));

vi.mock('../../../lib/compressImage', () => ({
  compressImageToWebP: vi
    .fn()
    .mockResolvedValue(new Blob(['test'], { type: 'image/webp' })),
}));

vi.mock('@panelcraft/types', () => ({}));

// Import after mocks
import { NewComicWizard } from '../NewComicWizard';
import { getWizardState, setWizardState } from '../../../lib/indexedDB';
import api from '../../../lib/api';

describe('NewComicWizard Phase 1 Smoke Tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = vi.fn();
    // Reset IndexedDB mocks
    (getWizardState as any).mockResolvedValue(null);
    (setWizardState as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  it('renders without crashing and shows step 0', async () => {
    render(<NewComicWizard />);
    await act(async () => {
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/futuristic detective/i)
      ).toBeInTheDocument();
    });

    // Exercises the topStrip slot regression net (C1 / N3)
    const topstrip = screen.getByTestId('topstrip-slot');
    expect(topstrip).toBeInTheDocument();
    expect(topstrip.textContent).toMatch(/back to onboarding/i);
  }, 5000);

  it('hydrates state from IndexedDB on mount', async () => {
    const savedState = {
      wizardStateVersion: 1,
      step: 1,
      formValues: {
        prompt: 'Test prompt',
        panelCount: 2,
        genres: ['Sci-Fi'],
        tones: ['Dark'],
        characters: [
          {
            name: 'John',
            role: 'Hero',
            visual: 'Tall character description',
            consistency: 'Yes consistency notes',
          },
        ],
        globalStylePrompt: 'Noir style description',
        moodBoardPreset: 'preset-1',
        artDirectionNotes: 'Notes',
      },
      referenceImageBlobs: {},
      moodBoardImageBlobs: [],
      preferredLayoutId: 'layout-1',
      projectId: 'proj-456',
    };
    (getWizardState as any).mockResolvedValue(savedState);

    render(<NewComicWizard />);
    await act(async () => {
      await Promise.resolve();
    });

    // Should render step 1 content
    await waitFor(() => {
      expect(screen.getByText(/build your cast/i)).toBeInTheDocument();
    });
  }, 5000);

  it('submits step 0 and advances to step 1 after calling api.analyzePrompt', async () => {
    // Pre-populate subsequent step fields to satisfy the global Zod validation schema
    const savedState = {
      wizardStateVersion: 1,
      step: 0,
      formValues: {
        prompt: '',
        panelCount: 4,
        genres: [],
        tones: [],
        characters: [
          {
            name: 'John',
            role: 'Hero',
            visual: 'Tall character description is long enough',
            consistency: 'Yes consistency notes',
          },
        ],
        globalStylePrompt: 'Noir style description is long enough',
        moodBoardPreset: 'preset-1',
        artDirectionNotes: '',
      },
      referenceImageBlobs: {},
      moodBoardImageBlobs: [],
      preferredLayoutId: null,
      projectId: null,
    };
    (getWizardState as any).mockResolvedValue(savedState);

    const user = userEvent.setup();
    render(<NewComicWizard />);
    await act(async () => {
      await Promise.resolve();
    });

    const promptText =
      'A futuristic detective tracking down a rogue AI in a neon-drenched city.';
    const textarea =
      await screen.findByPlaceholderText(/futuristic detective/i);

    await act(async () => {
      await user.type(textarea, promptText);
    });

    // Click Analyze Prompt
    const analyzeButton = screen.getByRole('button', {
      name: /analyze prompt/i,
    });
    await act(async () => {
      await user.click(analyzeButton);
    });

    expect(api.analyzePrompt).toHaveBeenCalledWith(promptText);

    // Wait for Next button to become available
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /next/i });
    await act(async () => {
      await user.click(nextButton);
    });

    // Should now render step 1 content
    await waitFor(() => {
      expect(screen.getByText(/build your cast/i)).toBeInTheDocument();
    });
  }, 5000);

  it('polls project status and redirects when completed', async () => {
    // Hydrate state at step 3 (Review & Submit)
    const savedState = {
      wizardStateVersion: 1,
      step: 3,
      formValues: {
        prompt: 'Test prompt that is long enough',
        panelCount: 4,
        genres: ['Fantasy'],
        tones: ['Epic'],
        characters: [
          {
            name: 'John',
            role: 'Hero',
            visual: 'Tall character description',
            consistency: 'Yes consistency notes',
          },
        ],
        globalStylePrompt: 'Noir style description is long enough',
        moodBoardPreset: 'preset-1',
        artDirectionNotes: 'Notes',
      },
      referenceImageBlobs: {},
      moodBoardImageBlobs: [],
      preferredLayoutId: null,
      projectId: null,
    };
    (getWizardState as any).mockResolvedValue(savedState);

    // Mock fetch for polling
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: { project: { status: 'processing' } },
          }),
        } as any;
      }
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            project: {
              status: 'pending_layout',
              layoutOptions: ['layout-1', 'layout-2'],
              coverImageUrl: 'http://example.com/cover.jpg',
            },
          },
        }),
      } as any;
    });

    render(<NewComicWizard />);
    await act(async () => {
      await Promise.resolve();
    });

    // Wait for the submit button to render under real timers
    const submitButton = await screen.findByRole('button', {
      name: /create comic with varo/i,
    });

    // Enable fake timers now to intercept setInterval
    vi.useFakeTimers();

    // Click submit/create button
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Wait for step 4 rendering
    await act(async () => {
      // Allow onSubmit promise to resolve
      await Promise.resolve();
    });

    expect(
      screen.getByText(/Varo is dreaming up your world/i)
    ).toBeInTheDocument();

    // Advance timers by 2000ms to trigger the first poll (processing)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // Advance timers by another 2000ms to trigger second poll (pending_layout)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // Should transition to layout selection
    expect(screen.getByText(/choose your layout/i)).toBeInTheDocument();

    vi.useRealTimers();
  }, 10000);

  it('revokes all object URLs on unmount when mood board blobs exist', async () => {
    const savedState = {
      wizardStateVersion: 1,
      step: 2,
      formValues: {
        prompt: 'Test prompt that is long enough',
        panelCount: 4,
        genres: ['Fantasy'],
        tones: ['Epic'],
        characters: [
          {
            name: 'John',
            role: 'Hero',
            visual: 'Tall description',
            consistency: 'Yes consistency notes',
          },
        ],
        globalStylePrompt: 'Noir style description is long enough',
        moodBoardPreset: 'preset-1',
        artDirectionNotes: 'Notes',
      },
      referenceImageBlobs: {},
      moodBoardImageBlobs: [new Blob(['mood1'], { type: 'image/webp' })],
      preferredLayoutId: null,
      projectId: null,
    };
    (getWizardState as any).mockResolvedValue(savedState);

    const { unmount } = render(<NewComicWizard />);
    await act(async () => {
      await Promise.resolve();
    });

    // Wait for step 2 Style Preset section title to render
    await screen.findByRole('heading', { name: /style preset/i });

    // Unmount
    unmount();

    // Verify URLs are revoked
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  }, 5000);

  it('persists form mutations to IndexedDB', async () => {
    render(<NewComicWizard />);
    await act(async () => {
      await Promise.resolve();
    });

    const promptText =
      'A futuristic detective tracking down a rogue AI in a neon-drenched city.';
    const textarea =
      await screen.findByPlaceholderText(/futuristic detective/i);

    // Direct change & blur
    await act(async () => {
      fireEvent.change(textarea, { target: { value: promptText } });
    });
    await act(async () => {
      fireEvent.blur(textarea);
    });

    await waitFor(() => {
      expect(setWizardState).toHaveBeenCalled();
    });
  }, 5000);

  // Regression net for the useWizardForm/useWizardPersistence wiring: a no-arg
  // saveToIndexedDB() call (e.g. on input blur) must NOT clobber hydrated
  // blobs / preferredLayoutId / projectId. Earlier this hook was constructed
  // with hardcoded empties, so every blur silently wiped them.
  it('preserves hydrated blobs/ids when saving form mutations with no overrides', async () => {
    const hydratedBlob = new Blob(['ref'], { type: 'image/webp' });
    const savedState = {
      wizardStateVersion: 1,
      step: 0,
      formValues: {
        prompt: 'Initial prompt',
        panelCount: 4,
        genres: ['Fantasy'],
        tones: ['Epic'],
        characters: [
          {
            name: 'John',
            role: 'Hero',
            visual: 'Tall character description',
            consistency: 'Yes consistency notes',
            referenceImageKey: 'char-0-existing',
          },
        ],
        globalStylePrompt: 'Noir style description is long enough',
        moodBoardPreset: 'preset-1',
        artDirectionNotes: '',
      },
      referenceImageBlobs: { 'char-0-existing': hydratedBlob },
      moodBoardImageBlobs: [new Blob(['mood'], { type: 'image/webp' })],
      preferredLayoutId: 'layout-existing',
      projectId: 'project-existing',
    };
    (getWizardState as any).mockResolvedValue(savedState);

    render(<NewComicWizard />);
    await act(async () => {
      await Promise.resolve();
    });

    const textarea =
      await screen.findByPlaceholderText(/futuristic detective/i);

    // Triggers a no-arg saveToIndexedDB() via the prompt blur handler.
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Edited prompt text' } });
    });
    await act(async () => {
      fireEvent.blur(textarea);
    });

    await waitFor(() => {
      expect(setWizardState).toHaveBeenCalled();
    });

    const lastCall = (setWizardState as any).mock.calls.at(-1)?.[0];
    expect(lastCall).toBeDefined();
    expect(lastCall.referenceImageBlobs).toEqual({
      'char-0-existing': hydratedBlob,
    });
    expect(lastCall.moodBoardImageBlobs).toHaveLength(1);
    expect(lastCall.preferredLayoutId).toBe('layout-existing');
    expect(lastCall.projectId).toBe('project-existing');
  }, 5000);
});

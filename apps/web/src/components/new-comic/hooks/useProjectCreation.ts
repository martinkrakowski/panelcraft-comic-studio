import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@panelcraft/ui';
import type { UseFormWatch } from 'react-hook-form';
import { useCreateProject } from '../../../lib/hooks/useCreateProject';
import { usePolling, type WizardPersistedState } from '../../../lib/hooks';
import { clearWizardState } from '../../../lib/indexedDB';
import type { WizardFormValues } from '../../../lib/validation/wizard-schemas';

type SaveToIndexedDB = (
  overrides?: Partial<WizardPersistedState>
) => Promise<void>;

interface UseProjectCreationProps {
  projectId: string | null;
  setProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  isPolling: boolean;
  setIsPolling: React.Dispatch<React.SetStateAction<boolean>>;
  referenceImageBlobs: Record<string, Blob>;
  moodBoardImageBlobs: Blob[];
  watch: UseFormWatch<WizardFormValues>;
  setActiveStep: React.Dispatch<React.SetStateAction<number>>;
  saveToIndexedDB: SaveToIndexedDB;
  /**
   * Layout template ID picked in Step 0's Recommended Layouts sidebar.
   * When set, the wizard auto-confirms this layout as soon as the project
   * reaches `pending_layout`, skipping the manual Step 4 chooser UI.
   */
  preferredLayoutId: string | null;
}

export function useProjectCreation({
  projectId,
  setProjectId,
  isPolling,
  setIsPolling,
  referenceImageBlobs,
  moodBoardImageBlobs,
  watch,
  setActiveStep,
  saveToIndexedDB,
  preferredLayoutId,
}: UseProjectCreationProps) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    createProject,
    selectLayout,
    loading: isSubmitting,
  } = useCreateProject();

  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [layoutOptions, setLayoutOptions] = useState<string[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  // Guards the auto-confirm path so a slow poll doesn't kick a second
  // selectLayout request while the first is still in flight or after
  // navigation has begun.
  const autoConfirmedRef = useRef(false);

  const onSubmit = async () => {
    try {
      const formData = watch();
      const fd = new FormData();
      fd.append('prompt', formData.prompt);
      fd.append('panelCount', String(formData.panelCount));
      fd.append('genres', JSON.stringify(formData.genres));
      fd.append('tones', JSON.stringify(formData.tones));
      fd.append(
        'characterBible',
        JSON.stringify({ characters: formData.characters })
      );
      fd.append('globalStylePrompt', formData.globalStylePrompt);
      fd.append('moodBoardPreset', formData.moodBoardPreset);
      if (formData.artDirectionNotes)
        fd.append('artDirectionNotes', formData.artDirectionNotes);

      formData.characters.forEach((char, i) => {
        const key = char.referenceImageKey;
        if (key && referenceImageBlobs[key]) {
          fd.append(
            `referenceImages_${i}`,
            new File([referenceImageBlobs[key]], `char-${i}.webp`, {
              type: 'image/webp',
            })
          );
        }
      });

      moodBoardImageBlobs.forEach((blob, i) => {
        fd.append(
          'moodBoardImages',
          new File([blob], `mood-${i}.webp`, { type: 'image/webp' })
        );
      });

      const res = await createProject(fd);
      setProjectId(res.projectId);
      setProjectStatus(res.status);
      setActiveStep(4);
      await saveToIndexedDB({ projectId: res.projectId, activeStep: 4 });
      setIsPolling(true);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Creation failed',
        description:
          err instanceof Error ? err.message : 'Could not create project',
      });
    }
  };

  const handleLayoutSelect = async (layout: string) => {
    if (!projectId) return;
    try {
      await selectLayout(projectId, layout);
      await clearWizardState();
      router.push(`/projects/${projectId}`);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Layout selection failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  usePolling(
    async () => {
      if (!projectId) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects/${projectId}`
        );
        const data = await res.json();
        if (data.success) {
          setProjectStatus(data.data.project.status);
          if (data.data.project.status === 'pending_layout') {
            setLayoutOptions(data.data.project.layoutOptions || []);
            setCoverUrl(data.data.project.coverImageUrl || null);
            setIsPolling(false);
            // If Step 0 pre-picked a recommended layout, skip the manual
            // chooser and confirm it for the user. The catalog ID is stored
            // verbatim as `selectedLayout` so render-time lookup can pull
            // the rich panel-rect template back out.
            if (preferredLayoutId && !autoConfirmedRef.current) {
              autoConfirmedRef.current = true;
              handleLayoutSelect(preferredLayoutId);
            }
          } else if (data.data.project.status === 'failed') {
            setIsPolling(false);
            toast({
              variant: 'destructive',
              title: 'Generation failed',
              description: 'Project generation failed. Please try again.',
            });
          } else if (
            ['completed', 'pending_review'].includes(data.data.project.status)
          ) {
            setIsPolling(false);
            // Fire-and-forget cleanup of persisted wizard state — awaiting
            // could hang here if the IndexedDB transaction stalls and would
            // block navigation to the project page. The next 'New Comic'
            // click reads fresh state, so a delayed clear is acceptable.
            clearWizardState().catch((err) => {
              console.warn('Failed to clear wizard state', err);
            });
            router.push(`/projects/${projectId}`);
          }
        }
      } catch {
        // Ignore poll errors
      }
    },
    {
      enabled: isPolling && !!projectId,
      intervalMs: 2000,
      immediateFirstCall: true,
    }
  );

  const handleRetry = useCallback(async () => {
    setProjectId(null);
    setProjectStatus(null);
    setActiveStep(3);
    await saveToIndexedDB({ projectId: null, activeStep: 3 });
  }, [saveToIndexedDB, setProjectId, setActiveStep]);

  return {
    onSubmit,
    handleLayoutSelect,
    handleRetry,
    projectStatus,
    layoutOptions,
    coverUrl,
    isSubmitting,
  };
}

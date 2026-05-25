import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@panelcraft/ui';
import type { UseFormWatch } from 'react-hook-form';
import { useCreateProject } from '../../../lib/hooks/useCreateProject';
import { usePolling } from '../../../lib/hooks';
import { clearWizardState } from '../../../lib/indexedDB';
import type { WizardFormValues } from '../../../lib/validation/wizard-schemas';

type SaveToIndexedDB = (overrides?: {
  referenceImageBlobs?: Record<string, Blob>;
  moodBoardImageBlobs?: Blob[];
  preferredLayoutId?: string | null;
  projectId?: string | null;
  activeStep?: number;
}) => Promise<void>;

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
            // Clear persisted wizard state before navigating away so a fresh
            // "New Comic" click starts from defaults instead of resurrecting
            // the just-submitted form values.
            await clearWizardState();
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

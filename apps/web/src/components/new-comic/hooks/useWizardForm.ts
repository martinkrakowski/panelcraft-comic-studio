'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  wizardFormSchema,
  type WizardFormValues,
} from '../../../lib/validation/wizard-schemas';
import { getDefaultWizardValues } from '../../../lib/wizard-constants';
import {
  getWizardState,
  clearWizardState,
  IndexedDBQuotaExceededError,
} from '../../../lib/indexedDB';
import { useWizardPersistence, type WizardPersistedState } from '../../../lib/hooks';
import { useToast } from '@panelcraft/ui';

interface UseWizardFormArgs {
  activeStep: number;
  setActiveStep: (step: number) => void;
  referenceImageBlobs: Record<string, Blob>;
  setReferenceImageBlobs: (blobs: Record<string, Blob>) => void;
  moodBoardImageBlobs: Blob[];
  setMoodBoardImageBlobs: (blobs: Blob[]) => void;
  preferredLayoutId: string | null;
  setPreferredLayoutId: (id: string | null) => void;
  projectId: string | null;
  setProjectId: (id: string | null) => void;
}

export function useWizardForm({
  activeStep,
  setActiveStep,
  referenceImageBlobs,
  setReferenceImageBlobs,
  moodBoardImageBlobs,
  setMoodBoardImageBlobs,
  preferredLayoutId,
  setPreferredLayoutId,
  projectId,
  setProjectId,
}: UseWizardFormArgs) {
  const { toast } = useToast();

  const form = useForm<WizardFormValues>({
    resolver: zodResolver(wizardFormSchema),
    defaultValues: async () => {
      if (typeof window === 'undefined') return getDefaultWizardValues();
      const saved = await getWizardState();
      if (saved?.wizardStateVersion === 1) {
        if (saved.step >= 4) {
          clearWizardState().catch((err) =>
            console.warn('Failed to clear stale wizard state', err)
          );
          return getDefaultWizardValues();
        }
        setActiveStep(saved.step);
        setReferenceImageBlobs(saved.referenceImageBlobs || {});
        setMoodBoardImageBlobs(saved.moodBoardImageBlobs || []);
        setPreferredLayoutId(saved.preferredLayoutId || null);
        setProjectId(saved.projectId || null);
        return saved.formValues as WizardFormValues;
      }
      return getDefaultWizardValues();
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'characters',
  });

  const { save: saveStateToDB } = useWizardPersistence({
    activeStep,
    referenceImageBlobs,
    moodBoardImageBlobs,
    preferredLayoutId,
    projectId,
  });

  const saveToIndexedDB = async (overrides?: Partial<WizardPersistedState>) => {
    if (typeof window === 'undefined') return;
    try {
      // getValues is an imperative read — no subscription, so this no longer
      // forces a re-render of the wizard host on every form change.
      await saveStateToDB(form.getValues(), overrides);
    } catch (err) {
      if (err instanceof IndexedDBQuotaExceededError) {
        toast({
          variant: 'destructive',
          title: 'Storage full',
          description: (err as Error).message,
        });
      } else {
        console.warn('Failed to persist wizard state', err);
      }
    }
  };

  return {
    form,
    fields,
    append,
    remove,
    saveToIndexedDB,
  };
}

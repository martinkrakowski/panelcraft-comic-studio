'use client';

// @ts-nocheck

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
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
import { useWizardPersistence } from '../../../lib/hooks';
import { useToast } from '@panelcraft/ui';

interface UseWizardFormArgs {
  activeStep: number;
  setActiveStep: (step: number) => void;
  setReferenceImageBlobs: (blobs: Record<string, Blob>) => void;
  setMoodBoardImageBlobs: (blobs: Blob[]) => void;
  setPreferredLayoutId: (id: string | null) => void;
  setProjectId: (id: string | null) => void;
}

export function useWizardForm({
  activeStep,
  setActiveStep,
  setReferenceImageBlobs,
  setMoodBoardImageBlobs,
  setPreferredLayoutId,
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
    referenceImageBlobs: {}, // Note: these are managed outside for now to avoid circular deps
    moodBoardImageBlobs: [],
    preferredLayoutId: null,
    projectId: null,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveToIndexedDB = async (overrides?: any) => {
    if (typeof window === 'undefined') return;
    try {
      await saveStateToDB(form.watch(), overrides);
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

  // Watched values (convenience)
  const prompt = form.watch('prompt');
  const panelCount = form.watch('panelCount');
  const genres = form.watch('genres');
  const tones = form.watch('tones');
  const characters = form.watch('characters');
  const moodBoardPreset = form.watch('moodBoardPreset');

  return {
    form,
    fields,
    append,
    remove,
    saveToIndexedDB,
    // Convenience watched values
    prompt,
    panelCount,
    genres,
    tones,
    characters,
    moodBoardPreset,
  };
}

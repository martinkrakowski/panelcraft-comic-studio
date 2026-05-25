'use client';

import React, { useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@panelcraft/ui';
import { NewComicWizardSidebar } from './NewComicWizardSidebar';
import { useObjectUrls, useWizardPersistence } from '../../lib/hooks';
import {
  getWizardState,
  clearWizardState,
  IndexedDBQuotaExceededError,
} from '../../lib/indexedDB';
import {
  wizardFormSchema,
  type WizardFormValues,
} from '../../lib/validation/wizard-schemas';
import { getDefaultWizardValues } from '../../lib/wizard-constants';
import {
  StoryPromptStep,
  CharacterBibleStep,
  StyleReferencesStep,
  ReviewSubmitStep,
  LayoutChooserStep,
} from './steps';
import { WizardStepIndicator } from './WizardStepIndicator';
import { WizardNavButtons } from './WizardNavButtons';
import { useWizardStepNavigation } from './hooks/useWizardStepNavigation';
import { useImageUploads } from './hooks/useImageUploads';
import { useProjectCreation } from './hooks/useProjectCreation';
import styles from './NewComicWizard.module.css';

export function NewComicWizard() {
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [referenceImageBlobs, setReferenceImageBlobs] = useState<
    Record<string, Blob>
  >({});
  const [moodBoardImageBlobs, setMoodBoardImageBlobs] = useState<Blob[]>([]);
  const [preferredLayoutId, setPreferredLayoutId] = useState<string | null>(
    null
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<WizardFormValues>({
    resolver: zodResolver(wizardFormSchema),
    defaultValues: async () => {
      if (typeof window === 'undefined') return getDefaultWizardValues();
      const saved = await getWizardState();
      if (saved?.wizardStateVersion === 1) {
        // Post-submission state (layout chooser) lives on the project page;
        // dropping users straight back into step 4 when they click "Brainstorm
        // Idea" is jarring. Treat reaching step 4 as the end of the wizard's
        // responsibility and start the next visit fresh.
        if (saved.step >= 4) {
          // Fire-and-forget: don't gate the first render on IndexedDB.
          // A failure here is non-fatal (we already return defaults below).
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
    control,
    name: 'characters',
  });
  const prompt = watch('prompt');
  const panelCount = watch('panelCount');
  const genres = watch('genres');
  const tones = watch('tones');
  const characters = watch('characters');
  const moodBoardPreset = watch('moodBoardPreset');

  const { save: saveStateToDB } = useWizardPersistence({
    activeStep,
    referenceImageBlobs,
    moodBoardImageBlobs,
    preferredLayoutId,
    projectId,
  });

  const saveToIndexedDB = useCallback(
    async (overrides?: {
      referenceImageBlobs?: Record<string, Blob>;
      moodBoardImageBlobs?: Blob[];
      preferredLayoutId?: string | null;
      projectId?: string | null;
      activeStep?: number;
    }) => {
      if (typeof window === 'undefined') return;
      try {
        await saveStateToDB(watch(), overrides);
      } catch (err) {
        if (err instanceof IndexedDBQuotaExceededError) {
          toast({
            variant: 'destructive',
            title: 'Storage full',
            description: err.message,
          });
        } else {
          console.warn('Failed to persist wizard state', err);
        }
      }
    },
    [saveStateToDB, watch, toast]
  );

  const { handleNextStep, handleBackStep, handleAnalyzePrompt, isAnalyzing } =
    useWizardStepNavigation({
      activeStep,
      setActiveStep,
      trigger,
      setValue,
      prompt,
      saveToIndexedDB,
    });

  const { handleCharacterImageUpload, handleMoodBoardUpload } = useImageUploads(
    {
      referenceImageBlobs,
      setReferenceImageBlobs,
      moodBoardImageBlobs,
      setMoodBoardImageBlobs,
      setValue,
      saveToIndexedDB,
    }
  );

  const {
    onSubmit,
    handleLayoutSelect,
    handleRetry,
    projectStatus,
    layoutOptions,
    coverUrl,
    isSubmitting,
  } = useProjectCreation({
    projectId,
    setProjectId,
    isPolling,
    setIsPolling,
    referenceImageBlobs,
    moodBoardImageBlobs,
    watch,
    setActiveStep,
    saveToIndexedDB,
  });

  const moodBoardObjectUrls = useObjectUrls(moodBoardImageBlobs);

  return (
    <div className="fixed inset-0 bg-slate-950 flex gap-[var(--panelcraft-gutter-space)] overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

      <NewComicWizardSidebar
        activeStep={activeStep}
        genres={genres}
        tones={tones}
        panelCount={panelCount}
        preferredLayoutId={preferredLayoutId}
        setPreferredLayoutId={setPreferredLayoutId}
        setValue={setValue}
        saveToIndexedDB={saveToIndexedDB}
        register={register}
        fields={fields}
        characters={characters}
        moodBoardPreset={moodBoardPreset}
      />

      {/* mt-16 only on steps 0–2 to clear the WizardSidebar's chrome; from
          step 3 onward the sidebar is hidden so no top spacing is needed. */}
      <div
        className={`flex-1 flex flex-col overflow-hidden rounded-xl bg-slate-900/50 backdrop-blur-sm relative ${activeStep < 3 ? 'mt-16' : ''}`}
      >
        <div className="flex-shrink-0 px-4 pt-4 relative z-10">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to onboarding
          </button>
        </div>

        <WizardStepIndicator activeStep={activeStep} />

        <div className="flex-1 overflow-y-auto">
          {activeStep === 0 && (
            <div className="px-4 pb-8 flex justify-center">
              <img
                src="/tell-your-story.jpg"
                alt="Tell your story"
                className="rounded-lg"
                style={{ maxWidth: '784px', width: '100%', maxHeight: '100%' }}
              />
            </div>
          )}

          <div
            className={`${styles.container} relative z-10 mx-auto max-w-2xl px-4`}
            style={{ paddingBottom: '8rem' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                {activeStep === 0 && (
                  <StoryPromptStep
                    register={register}
                    errors={errors}
                    watchPrompt={prompt}
                    watchGenres={genres}
                    watchTones={tones}
                    setValue={setValue}
                    isAnalyzing={isAnalyzing}
                    handleAnalyzePrompt={handleAnalyzePrompt}
                    saveToIndexedDB={saveToIndexedDB}
                  />
                )}
                {activeStep === 1 && (
                  <CharacterBibleStep
                    register={register}
                    errors={errors}
                    fields={fields}
                    append={append}
                    remove={remove}
                    handleCharacterImageUpload={handleCharacterImageUpload}
                    saveToIndexedDB={saveToIndexedDB}
                  />
                )}
                {activeStep === 2 && (
                  <StyleReferencesStep
                    register={register}
                    errors={errors}
                    watchMoodBoardPreset={moodBoardPreset}
                    setValue={setValue}
                    handleMoodBoardUpload={handleMoodBoardUpload}
                    moodBoardObjectUrls={moodBoardObjectUrls}
                    saveToIndexedDB={saveToIndexedDB}
                  />
                )}
                {activeStep === 3 && (
                  <ReviewSubmitStep
                    watchPrompt={prompt}
                    watchPanelCount={panelCount}
                    watchGenres={genres}
                    watchTones={tones}
                    watchCharacters={characters}
                    watchMoodBoardPreset={moodBoardPreset}
                    watchGlobalStylePrompt={watch('globalStylePrompt')}
                    setActiveStep={setActiveStep}
                    isSubmitting={isSubmitting}
                    handleSubmit={handleSubmit}
                    onSubmit={onSubmit}
                  />
                )}
                {activeStep === 4 && (
                  <LayoutChooserStep
                    isPolling={isPolling}
                    projectStatus={projectStatus}
                    coverUrl={coverUrl}
                    layoutOptions={layoutOptions}
                    handleLayoutSelect={handleLayoutSelect}
                    onRetry={handleRetry}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <WizardNavButtons
            activeStep={activeStep}
            onBack={handleBackStep}
            onNext={handleNextStep}
          />
        </div>
      </div>
    </div>
  );
}

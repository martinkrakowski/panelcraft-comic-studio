'use client';

import React, { useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useToast, AppCanvasTwoPane } from '@panelcraft/ui';
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
import { WizardStepContent } from './WizardStepContent';
import { useWizardStepNavigation } from './hooks/useWizardStepNavigation';
import { useImageUploads } from './hooks/useImageUploads';
import { useProjectCreation } from './hooks/useProjectCreation';
import { useWizardForm } from './hooks/useWizardForm';
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
    form,
    fields,
    append,
    remove,
    saveToIndexedDB,
    prompt,
    panelCount,
    genres,
    tones,
    characters,
    moodBoardPreset,
  } = useWizardForm({
    activeStep,
    setActiveStep,
    setReferenceImageBlobs,
    setMoodBoardImageBlobs,
    setPreferredLayoutId,
    setProjectId,
  });

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = form;

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
    <AppCanvasTwoPane
      sidebar={
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
      }
      clearHeader={activeStep < 3}
      topStrip={
        <>
          <div className="flex-shrink-0 px-4 pt-4">
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
        </>
      }
    >
      <WizardStepContent />

      <WizardNavButtons
        activeStep={activeStep}
        onBack={handleBackStep}
        onNext={handleNextStep}
      />
    </AppCanvasTwoPane>
  );
}

'use client';

import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AppCanvasTwoPane } from '@panelcraft/ui';
import { NewComicWizardSidebar } from './NewComicWizardSidebar';
import { useObjectUrls } from '../../lib/hooks';
import { WizardStepIndicator } from './WizardStepIndicator';
import { WizardNavButtons } from './WizardNavButtons';
import { WizardStepContent } from './WizardStepContent';
import { useWizardStepNavigation } from './hooks/useWizardStepNavigation';
import { useImageUploads } from './hooks/useImageUploads';
import { useProjectCreation } from './hooks/useProjectCreation';
import { useWizardForm } from './hooks/useWizardForm';

export function NewComicWizard() {
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
  const globalStylePrompt = watch('globalStylePrompt') || '';

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
      <WizardStepContent
        activeStep={activeStep}
        register={register}
        handleSubmit={handleSubmit}
        setValue={setValue}
        errors={errors}
        fields={fields}
        append={append}
        remove={remove}
        prompt={prompt}
        genres={genres}
        tones={tones}
        panelCount={panelCount}
        characters={characters}
        moodBoardPreset={moodBoardPreset}
        moodBoardObjectUrls={moodBoardObjectUrls}
        isAnalyzing={isAnalyzing}
        handleAnalyzePrompt={handleAnalyzePrompt}
        handleCharacterImageUpload={handleCharacterImageUpload}
        handleMoodBoardUpload={handleMoodBoardUpload}
        isSubmitting={isSubmitting}
        setActiveStep={setActiveStep}
        isPolling={isPolling}
        projectStatus={projectStatus}
        coverUrl={coverUrl}
        layoutOptions={layoutOptions}
        handleLayoutSelect={handleLayoutSelect}
        handleRetry={handleRetry}
        saveToIndexedDB={saveToIndexedDB}
        globalStylePrompt={globalStylePrompt}
        onSubmit={onSubmit}
      />

      <WizardNavButtons
        activeStep={activeStep}
        onBack={handleBackStep}
        onNext={handleNextStep}
      />
    </AppCanvasTwoPane>
  );
}

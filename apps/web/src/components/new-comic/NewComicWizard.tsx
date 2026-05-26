'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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

/**
 * Multi-step comic creation wizard. Drives the user through story prompt,
 * character bible, style references, review/submit, and layout selection,
 * persisting partial state to IndexedDB so the flow survives reloads.
 * Mounted by the `/new/brainstorm` route.
 *
 * @returns The two-pane wizard canvas with sidebar, step content, and nav.
 */
export function NewComicWizard() {
  const router = useRouter();
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
  } = useWizardForm({
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
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    control,
    formState: { errors },
  } = form;

  const { handleNextStep, handleBackStep, handleAnalyzePrompt, isAnalyzing } =
    useWizardStepNavigation({
      activeStep,
      setActiveStep,
      trigger,
      setValue,
      getValues,
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
          control={control}
          preferredLayoutId={preferredLayoutId}
          setPreferredLayoutId={setPreferredLayoutId}
          setValue={setValue}
          saveToIndexedDB={saveToIndexedDB}
          fields={fields}
        />
      }
      clearHeader={activeStep < 3}
      topStrip={
        <>
          <div className="flex-shrink-0 px-4 pt-4">
            <button
              type="button"
              onClick={() => router.push('/new')}
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
        control={control}
        register={register}
        handleSubmit={handleSubmit}
        setValue={setValue}
        errors={errors}
        fields={fields}
        append={append}
        remove={remove}
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

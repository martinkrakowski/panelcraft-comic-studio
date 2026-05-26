'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  Control,
  UseFormRegister,
  FieldErrors,
  UseFormSetValue,
  UseFormHandleSubmit,
  FieldArrayWithId,
} from 'react-hook-form';
import type { WizardFormValues } from '../../lib/validation/wizard-schemas';
import type { WizardPersistedState } from '../../lib/hooks';
import {
  StoryPromptStep,
  CharacterBibleStep,
  StyleReferencesStep,
  ReviewSubmitStep,
  LayoutChooserStep,
} from './steps';

interface WizardStepContentProps {
  activeStep: number;
  control: Control<WizardFormValues>;
  register: UseFormRegister<WizardFormValues>;
  handleSubmit: UseFormHandleSubmit<WizardFormValues>;
  setValue: UseFormSetValue<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
  fields: FieldArrayWithId<WizardFormValues, 'characters', 'id'>[];
  append: (value: WizardFormValues['characters'][number]) => void;
  remove: (index: number) => void;
  moodBoardObjectUrls: string[];
  isAnalyzing: boolean;
  handleAnalyzePrompt: () => Promise<void>;
  handleCharacterImageUpload: (index: number, file: File) => Promise<void>;
  handleMoodBoardUpload: (files: FileList) => Promise<void>;
  isSubmitting: boolean;
  setActiveStep: React.Dispatch<React.SetStateAction<number>>;
  isPolling: boolean;
  projectStatus: string | null;
  coverUrl: string | null;
  layoutOptions: string[];
  handleLayoutSelect: (layout: string) => Promise<void>;
  handleRetry: () => void;
  saveToIndexedDB: (overrides?: Partial<WizardPersistedState>) => Promise<void>;
  onSubmit: () => Promise<void>;
}

/**
 * Step router for the new-comic wizard. Switches on `activeStep` to render
 * one of the five step bodies (StoryPrompt, CharacterBible, StyleReferences,
 * ReviewSubmit, LayoutChooser) inside an `AnimatePresence` slide transition.
 * The form `control` is passed down so each step subscribes scoped via
 * `useWatch` instead of forcing the orchestrator to re-render.
 *
 * @returns The active step's body wrapped in the slide-transition container.
 */
export function WizardStepContent(props: WizardStepContentProps) {
  const {
    activeStep,
    control,
    register,
    handleSubmit,
    setValue,
    errors,
    fields,
    append,
    remove,
    moodBoardObjectUrls,
    isAnalyzing,
    handleAnalyzePrompt,
    handleCharacterImageUpload,
    handleMoodBoardUpload,
    isSubmitting,
    setActiveStep,
    isPolling,
    projectStatus,
    coverUrl,
    layoutOptions,
    handleLayoutSelect,
    handleRetry,
    saveToIndexedDB,
    onSubmit,
  } = props;

  return (
    <div className="mx-auto max-w-2xl px-4" style={{ paddingBottom: '8rem' }}>
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
            <>
              <div className="px-4 pb-8 flex justify-center">
                <img
                  src="/tell-your-story.jpg"
                  alt="Tell your story"
                  className="rounded-lg"
                  style={{ maxWidth: '784px', width: '100%', maxHeight: '100%' }}
                />
              </div>
              <StoryPromptStep
                control={control}
                register={register}
                errors={errors}
                setValue={setValue}
                isAnalyzing={isAnalyzing}
                handleAnalyzePrompt={handleAnalyzePrompt}
                saveToIndexedDB={saveToIndexedDB}
              />
            </>
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
              control={control}
              register={register}
              errors={errors}
              setValue={setValue}
              handleMoodBoardUpload={handleMoodBoardUpload}
              moodBoardObjectUrls={moodBoardObjectUrls}
              saveToIndexedDB={saveToIndexedDB}
            />
          )}
          {activeStep === 3 && (
            <ReviewSubmitStep
              control={control}
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
  );
}

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { UseFormReturn, FieldArrayWithId } from 'react-hook-form';
import {
  StoryPromptStep,
  CharacterBibleStep,
  StyleReferencesStep,
  ReviewSubmitStep,
  LayoutChooserStep,
} from './steps';
import type { WizardFormValues } from '../../lib/validation/wizard-schemas';

interface WizardStepContentProps {
  activeStep: number;
  form: UseFormReturn<WizardFormValues>;
  // Field array for characters (separate from main form)
  fields: FieldArrayWithId<WizardFormValues, 'characters', 'id'>[];
  append: (value: any) => void;
  remove: (index: number) => void;

  // Wizard-specific state & handlers not part of the form
  isAnalyzing: boolean;
  handleAnalyzePrompt: () => void;
  handleCharacterImageUpload: (index: number, file: File) => void;
  handleMoodBoardUpload: (files: FileList | null) => void;
  isSubmitting: boolean;
  setActiveStep: (step: number) => void;
  isPolling: boolean;
  projectStatus: any;
  coverUrl: string | null;
  layoutOptions: any[];
  handleLayoutSelect: (layout: string) => void;
  handleRetry: () => void;
  saveToIndexedDB: (overrides?: any) => Promise<void>;
}

/**
 * Extracted step content renderer for NewComicWizard.
 * Contains the AnimatePresence + framer-motion step switching logic.
 * Purely presentational / routing concern.
 */
export function WizardStepContent(props: WizardStepContentProps) {
  const {
    activeStep,
    form,
    fields,
    append,
    remove,
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
  } = props;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  // Watched values needed by steps
  const prompt = watch('prompt');
  const genres = watch('genres');
  const tones = watch('tones');
  const panelCount = watch('panelCount');
  const characters = watch('characters');
  const moodBoardPreset = watch('moodBoardPreset');
  const moodBoardObjectUrls = watch('moodBoardObjectUrls'); // Note: this one comes from parent state, not form

  return (
    <div
      className="mx-auto max-w-2xl px-4"
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
              onSubmit={form.handleSubmit}   // pass the bound submit handler
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

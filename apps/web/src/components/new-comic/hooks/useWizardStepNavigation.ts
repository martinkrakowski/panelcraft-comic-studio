import { useState } from 'react';
import { useToast } from '@panelcraft/ui';
import type {
  UseFormTrigger,
  UseFormSetValue,
  UseFormGetValues,
} from 'react-hook-form';
import api from '../../../lib/api';
import { GENRE_OPTIONS, TONE_OPTIONS } from '../../../lib/wizard-constants';
import {
  promptOnlySchema,
  type WizardFormValues,
} from '../../../lib/validation/wizard-schemas';
import type { WizardPersistedState } from '../../../lib/hooks';

type SaveToIndexedDB = (
  overrides?: Partial<WizardPersistedState>
) => Promise<void>;

interface UseWizardStepNavigationProps {
  activeStep: number;
  setActiveStep: React.Dispatch<React.SetStateAction<number>>;
  trigger: UseFormTrigger<WizardFormValues>;
  setValue: UseFormSetValue<WizardFormValues>;
  getValues: UseFormGetValues<WizardFormValues>;
  saveToIndexedDB: SaveToIndexedDB;
}

export function useWizardStepNavigation({
  activeStep,
  setActiveStep,
  trigger,
  setValue,
  getValues,
  saveToIndexedDB,
}: UseWizardStepNavigationProps) {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // The exact prompt string from the last successful analyze. Compared against
  // the live prompt to decide whether the footer shows Analyze or Next.
  const [lastAnalyzedPrompt, setLastAnalyzedPrompt] = useState<string | null>(
    null
  );

  const handleNextStep = async () => {
    let isValid = false;
    switch (activeStep) {
      case 0:
        isValid = await trigger(['prompt', 'panelCount', 'genres', 'tones']);
        break;
      case 1:
        isValid = await trigger(['characters']);
        break;
      case 2:
        isValid = await trigger(['globalStylePrompt', 'moodBoardPreset']);
        break;
      case 3:
        isValid = true;
        break;
      default:
        isValid = false;
    }
    if (isValid) {
      await saveToIndexedDB();
      setActiveStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBackStep = () => setActiveStep((prev) => Math.max(prev - 1, 0));

  const handleAnalyzePrompt = async () => {
    const prompt = getValues('prompt');
    try {
      promptOnlySchema.parse({ prompt });
    } catch (err) {
      if (err instanceof Error) {
        toast({
          variant: 'destructive',
          title: 'Validation error',
          description: err.message,
        });
      }
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await api.analyzePrompt(prompt);
      const allowedGenres = GENRE_OPTIONS as readonly string[];
      const allowedTones = TONE_OPTIONS as readonly string[];
      const nextGenres = (result.suggestedGenres || [])
        .filter((g) => allowedGenres.includes(g))
        .slice(0, 3);
      const nextTones = (result.suggestedTones || [])
        .filter((t) => allowedTones.includes(t))
        .slice(0, 3);
      if (nextGenres.length > 0) setValue('genres', nextGenres);
      if (nextTones.length > 0) setValue('tones', nextTones);
      setLastAnalyzedPrompt(prompt);
      toast({
        title: 'Analysis complete',
        description: result.feedback || 'Suggested genres/tones applied',
      });
      await saveToIndexedDB();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Analysis failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    handleNextStep,
    handleBackStep,
    handleAnalyzePrompt,
    isAnalyzing,
    lastAnalyzedPrompt,
  };
}

import { z } from 'zod';

// Character schema (used in wizardFormSchema)
export const characterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  visual: z
    .string()
    .min(10, 'Visual description must be at least 10 characters'),
  traits: z.string().optional(),
  consistency: z.string().min(10, 'Consistency notes required'),
  referenceImageKey: z.string().optional(),
});

// Prompt-only schema for analyze feature (independent validation without full form)
export const promptOnlySchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(10, 'Prompt must be at least 10 characters')
    .max(1000, 'Prompt cannot exceed 1000 characters'),
});

// Full form schema - validates all fields for submission
export const wizardFormSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(10, 'Prompt must be at least 10 characters')
    .max(1000, 'Prompt cannot exceed 1000 characters'),
  panelCount: z
    .number()
    .int()
    .min(1, 'Must have at least 1 panel')
    .max(4, 'Cannot exceed 4 panels (demo limit)'),
  genres: z
    .array(z.string())
    .min(1, 'Select at least one genre')
    .max(3, 'Max 3 genres'),
  tones: z
    .array(z.string())
    .min(1, 'Select at least one tone')
    .max(3, 'Max 3 tones'),
  characters: z
    .array(characterSchema)
    .min(1, 'Add at least one character')
    .max(10, 'Max 10 characters'),
  globalStylePrompt: z
    .string()
    .min(10, 'Style prompt required')
    .max(500, 'Max 500 characters'),
  moodBoardPreset: z.string().min(1, 'Select a style preset'),
  artDirectionNotes: z.string().max(500, 'Max 500 characters').optional(),
});

export type WizardFormValues = z.infer<typeof wizardFormSchema>;
export type PromptOnly = z.infer<typeof promptOnlySchema>;

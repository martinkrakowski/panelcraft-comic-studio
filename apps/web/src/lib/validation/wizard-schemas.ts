import { z } from 'zod';

// Step 1: Story Input
export const step1Schema = z.object({
  prompt: z
    .string()
    .trim()
    .min(10, 'Prompt must be at least 10 characters')
    .max(1000, 'Prompt cannot exceed 1000 characters'),
  panelCount: z
    .number()
    .int()
    .min(1, 'Must have at least 1 panel')
    .max(20, 'Cannot exceed 20 panels'),
  genres: z
    .array(z.string())
    .min(1, 'Select at least one genre')
    .max(3, 'Max 3 genres'),
  tones: z
    .array(z.string())
    .min(1, 'Select at least one tone')
    .max(3, 'Max 3 tones'),
});

// Step 2: Character Bible
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

export const step2Schema = z.object({
  characters: z
    .array(characterSchema)
    .min(1, 'Add at least one character')
    .max(10, 'Max 10 characters'),
});

// Step 3: Style & References
export const step3Schema = z.object({
  globalStylePrompt: z
    .string()
    .min(10, 'Style prompt required')
    .max(500, 'Max 500 characters'),
  moodBoardPreset: z.string().min(1, 'Select a style preset'),
  artDirectionNotes: z.string().max(500, 'Max 500 characters').optional(),
});

// Step 4: Review (no new fields, validates all previous steps)
export const wizardFormSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema);

export type Step1Values = z.infer<typeof step1Schema>;
export type Step2Values = z.infer<typeof step2Schema>;
export type Step3Values = z.infer<typeof step3Schema>;
export type WizardFormValues = z.infer<typeof wizardFormSchema>;

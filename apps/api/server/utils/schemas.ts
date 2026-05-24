import { z } from 'zod';

export const UUIDSchema = z.string().uuid();

export const CreateProjectSchema = z.object({
  prompt: z.string().trim().min(10).max(1000),
  panelCount: z.number().int().min(1).max(20),
  genres: z.array(z.string()).optional(),
  tones: z.array(z.string()).optional(),
  characterBible: z.string().optional(), // JSON string of CharacterBible
  globalStylePrompt: z.string().optional(),
  moodBoardPreset: z.string().optional(),
  artDirectionNotes: z.string().optional(),
});

export const SubmitReviewSchema = z.object({
  approved: z.boolean(),
  comment: z.string().trim().max(500).optional(),
});

export const ParamIdSchema = z.object({
  id: UUIDSchema,
});

export const AnalyzePromptSchema = z.object({
  prompt: z.string().trim().min(10).max(1000),
});

export const ExtractCharactersSchema = z.object({
  prompt: z.string().trim().min(10).max(1000),
  genres: z.array(z.string()).optional(),
  tones: z.array(z.string()).optional(),
});

export const PreviewStyleSchema = z.object({
  stylePrompt: z.string().trim().min(1),
  preset: z.string().optional(),
  moodBoardImages: z.array(z.string()).optional(),
});

export const SelectLayoutSchema = z.object({
  selectedLayout: z.string().min(1),
});

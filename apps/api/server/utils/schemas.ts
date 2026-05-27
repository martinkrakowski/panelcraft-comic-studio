import { z } from 'zod';

export const UUIDSchema = z.string().uuid();

export const CreateProjectSchema = z.object({
  prompt: z.string().trim().min(10).max(1000),
  panelCount: z.number().int().min(1).max(4), // Limited to 4 for demo token efficiency
  genres: z.array(z.string().trim().max(50)).max(3).optional(),
  tones: z.array(z.string().trim().max(50)).max(3).optional(),
  characterBible: z.string().trim().max(10000).optional(), // JSON string of CharacterBible
  globalStylePrompt: z.string().trim().max(1000).optional(),
  moodBoardPreset: z.string().trim().max(100).optional(),
  artDirectionNotes: z.string().trim().max(1000).optional(),
});

export const SubmitReviewSchema = z.object({
  approved: z.boolean(),
  comment: z.string().trim().max(500).optional(),
  composeFlavor: z.enum(['composite-true', 'repaint']).optional(),
});

export const ParamIdSchema = z.object({
  id: UUIDSchema,
});

export const AnalyzePromptSchema = z.object({
  prompt: z.string().trim().min(10).max(1000),
});

export const ExtractCharactersSchema = z.object({
  prompt: z.string().trim().min(10).max(1000),
  genres: z.array(z.string().trim().max(50)).max(3).optional(),
  tones: z.array(z.string().trim().max(50)).max(3).optional(),
});

export const PreviewStyleSchema = z.object({
  stylePrompt: z.string().trim().min(1).max(1000),
  preset: z.string().trim().max(100).optional(),
  moodBoardImages: z.array(z.string().trim().max(500)).max(10).optional(),
});

export const SelectLayoutSchema = z.object({
  selectedLayout: z.string().min(1, 'Layout selection required'),
  layoutId: z.string().optional(), // Layout template ID (e.g., 'classic-flow', 'splash-full')
});

export const ExtendPanelsSchema = z.object({
  targetPanelCount: z.number().int().min(2).max(4),
  selectedLayout: z.string().min(1, 'Layout selection required'),
});

export const ShrinkPanelsSchema = z.object({
  keepIndices: z.array(z.number().int().min(0)).min(1).max(4),
  selectedLayout: z.string().min(1, 'Layout selection required'),
});

export const ComposeFinalPageSchema = z.object({
  regenFeedback: z.string().trim().max(1000).optional(),
  composeFlavor: z.enum(['composite-true', 'repaint']).optional(),
});

export const RegenerateCoverSchema = z.object({
  feedback: z.string().trim().max(1000).optional(),
});

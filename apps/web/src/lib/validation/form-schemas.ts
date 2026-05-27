import { z } from 'zod';

export const createProjectSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(10, 'Prompt must be at least 10 characters long')
    .max(1000, 'Prompt cannot exceed 1000 characters'),
  panelCount: z
    .number({
      error: (issue) => {
        if (issue.input === undefined) {
          return 'Panel count is required';
        }
        return 'Panel count must be a number';
      },
    })
    .int()
    .min(1, 'Comic must have at least 1 panel')
    .max(20, 'Comic cannot exceed 20 panels'),
});

export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

export const submitReviewSchema = z.object({
  approved: z.boolean({
    error: 'Please select whether you approve or reject this panel',
  }),
  comment: z
    .string()
    .trim()
    .max(500, 'Comment cannot exceed 500 characters')
    .optional(),
  // Only meaningful when rejecting at the `pending_review_final` gate; the
  // server ignores it on other review surfaces. Kept on the shared schema
  // so a single form can drive both per-panel and final-composition reviews.
  composeFlavor: z.enum(['composite-true', 'repaint']).optional(),
});

export type SubmitReviewFormValues = z.infer<typeof submitReviewSchema>;

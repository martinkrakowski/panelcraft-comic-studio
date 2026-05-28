import { defineEventHandler, readBody, setResponseStatus } from 'h3';
import { ok } from '../../utils/envelope.js';
import { parseBody } from '../../utils/validation.js';
import { PreviewStyleSchema } from '../../utils/schemas.js';
import { getImageGenerationClient } from '../../utils/dependencies.js';
import { uploadToStorage } from '../../utils/supabase.js';
import { requireUser } from '../../utils/auth-session.js';

/**
 * POST /api/wizard/preview-style
 * Generate a quick style preview image
 * @param event.body - { stylePrompt: string, preset?: string, moodBoardImages?: string[] }
 * @returns { previewImageUrl: string }
 */
export default defineEventHandler(async (event) => {
  requireUser(event);
  // Rate limiting handled globally by server/middleware/rate-limit.ts (image: 12 RPM)
  const { stylePrompt, preset, moodBoardImages } = parseBody(
    PreviewStyleSchema,
    await readBody(event)
  );
  const imageClient = getImageGenerationClient(event);

  try {
    const imageBuffer = await imageClient.generatePreview(stylePrompt, {
      preset,
      moodBoardImages,
    });

    // Upload to temp storage for preview (short expiry)
    const tempPath = `previews/${Date.now()}.webp`;
    const { signedUrl } = await uploadToStorage(
      'comics',
      tempPath,
      imageBuffer,
      'image/webp'
    );

    setResponseStatus(event, 200);
    return ok({ previewImageUrl: signedUrl });
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      setResponseStatus(event, 408);
      return { error: 'Style preview generation timed out. Please try again.' };
    }
    throw error;
  }
});

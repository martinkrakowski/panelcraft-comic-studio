import {
  defineEventHandler,
  readMultipartFormData,
  setResponseStatus,
} from 'h3';
import { ok } from '../../utils/envelope.js';
import { CreateProjectSchema } from '../../utils/schemas.js';
import { getComicUseCase } from '../../utils/dependencies.js';
import { getSupabaseClient, uploadToStorage } from '../../utils/supabase.js';
import sharp from 'sharp';

/**
 * POST /api/projects
 * Create a new comic project with optional file uploads
 * Accepts multipart/form-data with fields and files
 * @returns 201 with project data + signed URLs for uploaded images
 */
export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event);
  if (!formData) {
    setResponseStatus(event, 400);
    return { error: 'Invalid multipart form data' };
  }

  // Parse fields from form data
  const fields: Record<string, string> = {};
  const files: { name: string; data: Buffer; type: string }[] = [];

  for (const part of formData) {
    if (part.filename) {
      files.push({
        name: part.name,
        data: Buffer.from(part.data),
        type: part.type || 'application/octet-stream',
      });
    } else if (part.name && part.data) {
      fields[part.name] = part.data.toString();
    }
  }

  // Parse JSON fields
  let characterBible = undefined;
  if (fields.characterBible) {
    try {
      characterBible = JSON.parse(fields.characterBible);
    } catch {
      setResponseStatus(event, 400);
      return { error: 'Invalid characterBible JSON' };
    }
  }

  let genres = undefined;
  if (fields.genres) {
    try {
      genres = JSON.parse(fields.genres);
    } catch {
      setResponseStatus(event, 400);
      return { error: 'Invalid genres JSON' };
    }
  }

  let tones = undefined;
  if (fields.tones) {
    try {
      tones = JSON.parse(fields.tones);
    } catch {
      setResponseStatus(event, 400);
      return { error: 'Invalid tones JSON' };
    }
  }

  // Validate input
  const validationResult = CreateProjectSchema.safeParse({
    prompt: fields.prompt,
    panelCount: fields.panelCount ? parseInt(fields.panelCount) : undefined,
    genres,
    tones,
    characterBible: fields.characterBible,
    globalStylePrompt: fields.globalStylePrompt,
    moodBoardPreset: fields.moodBoardPreset,
    artDirectionNotes: fields.artDirectionNotes,
  });

  if (!validationResult.success) {
    setResponseStatus(event, 400);
    return {
      error: 'Validation failed',
      details: validationResult.error.flatten(),
    };
  }

  const validated = validationResult.data;

  // Process and upload files
  const referenceImagePaths: string[] = [];
  const moodBoardImagePaths: string[] = [];

  try {
    for (const file of files) {
      // Resize and convert to WebP using sharp
      const processedImage = await sharp(file.data)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      // Determine upload path
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 9);
      let uploadPath = '';

      if (file.name === 'referenceImages') {
        uploadPath = `comics/{{projectId}}/references/${timestamp}-${randomId}.webp`;
        const { path, signedUrl } = await uploadToStorage(
          'comics',
          uploadPath,
          processedImage
        );
        referenceImagePaths.push(path);
      } else if (file.name === 'moodBoardImages') {
        uploadPath = `comics/{{projectId}}/mood-boards/${timestamp}-${randomId}.webp`;
        const { path, signedUrl } = await uploadToStorage(
          'comics',
          uploadPath,
          processedImage
        );
        moodBoardImagePaths.push(path);
      }
    }

    // Create project with validated data
    const projectId = await getComicUseCase(event).createProject({
      prompt: validated.prompt,
      panelCount: validated.panelCount,
      genres: validated.genres,
      tones: validated.tones,
      characterBible: validated.characterBible
        ? JSON.parse(validated.characterBible)
        : undefined,
      styleReferences: {
        globalStylePrompt: validated.globalStylePrompt || '',
        moodBoardPreset: validated.moodBoardPreset || '',
        moodBoardImages: moodBoardImagePaths,
        artDirectionNotes: validated.artDirectionNotes,
      },
      referenceImagePaths,
    });

    // Update file paths with actual project ID
    const updatedReferencePaths = referenceImagePaths.map((path) =>
      path.replace('{{projectId}}', projectId)
    );
    const updatedMoodBoardPaths = moodBoardImagePaths.map((path) =>
      path.replace('{{projectId}}', projectId)
    );

    // Update project with correct paths
    await getComicUseCase(event).updateProjectPaths(projectId, {
      referenceImagePaths: updatedReferencePaths,
      moodBoardImagePaths: updatedMoodBoardPaths,
    });

    // Generate signed URLs for response
    const supabase = getSupabaseClient();
    const referenceSignedUrls = await Promise.all(
      updatedReferencePaths.map(async (path) => {
        const { data } = await supabase.storage
          .from('comics')
          .createSignedUrl(path, 3600);
        return data?.signedUrl || '';
      })
    );
    const moodBoardSignedUrls = await Promise.all(
      updatedMoodBoardPaths.map(async (path) => {
        const { data } = await supabase.storage
          .from('comics')
          .createSignedUrl(path, 3600);
        return data?.signedUrl || '';
      })
    );

    setResponseStatus(event, 201);
    return ok({
      projectId,
      status: 'pending_creation',
      referenceImageUrls: referenceSignedUrls.filter(Boolean),
      moodBoardImageUrls: moodBoardSignedUrls.filter(Boolean),
    });
  } catch (error) {
    // Clean up any uploaded files if metadata save fails
    const supabase = getSupabaseClient();
    for (const path of [...referenceImagePaths, ...moodBoardImagePaths]) {
      await supabase.storage.from('comics').remove([path]);
    }
    throw error;
  }
});

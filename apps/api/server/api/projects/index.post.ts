import {
  defineEventHandler,
  readMultipartFormData,
  setResponseStatus,
} from 'h3';
import { ok } from '../../utils/envelope.js';
import { CreateProjectSchema } from '../../utils/schemas.js';
import { getComicUseCase } from '../../utils/dependencies.js';
import { getSupabaseClient, uploadToStorage } from '../../utils/supabase.js';
import { formatLayoutSuggestions } from '../../utils/layout-suggestions.js';
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
  const files: Array<{ name: string; data: Buffer; type: string }> = [];

  for (const part of formData) {
    if (part.filename && part.name) {
      files.push({
        name: part.name,
        data: Buffer.from(part.data),
        type: part.type || 'application/octet-stream',
      });
    } else if (part.name && part.data) {
      fields[part.name] = part.data.toString();
    }
  }

  // Validate uploaded files (MIME type + size)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      setResponseStatus(event, 400);
      return { error: `File ${file.name} is not an image (got ${file.type})` };
    }
    if (file.data.length > MAX_FILE_SIZE) {
      setResponseStatus(event, 400);
      return { error: `File ${file.name} exceeds 10MB limit` };
    }
  }

  // Parse JSON fields
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

  // Step 1: Create project first to get the ID
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
      moodBoardImages: [],
      artDirectionNotes: validated.artDirectionNotes,
    },
    referenceImagePaths: [],
  });

  // Step 2: Process and upload files with correct project ID
  const referenceImagePaths: string[] = [];
  const moodBoardImagePaths: string[] = [];
  const supabase = getSupabaseClient();

  for (const file of files) {
    // Resize and convert to WebP using sharp
    const processedImage = await sharp(file.data)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);

    let uploadPath = '';
    if (file.name === 'referenceImages') {
      uploadPath = `comics/${projectId}/references/${timestamp}-${randomId}.webp`;
      const { path } = await uploadToStorage(
        'comics',
        uploadPath,
        processedImage
      );
      referenceImagePaths.push(path);
    } else if (file.name === 'moodBoardImages') {
      uploadPath = `comics/${projectId}/mood-boards/${timestamp}-${randomId}.webp`;
      const { path } = await uploadToStorage(
        'comics',
        uploadPath,
        processedImage
      );
      moodBoardImagePaths.push(path);
    }
  }

  // Step 3: Update project with correct file paths
  await getComicUseCase(event).updateProjectPaths(projectId, {
    referenceImagePaths,
    moodBoardImagePaths,
  });

  // Generate signed URLs for response
  const referenceSignedUrls = await Promise.all(
    referenceImagePaths.map(async (path) => {
      const { data } = await supabase.storage
        .from('comics')
        .createSignedUrl(path, 3600);
      return data?.signedUrl || '';
    })
  );
  const moodBoardSignedUrls = await Promise.all(
    moodBoardImagePaths.map(async (path) => {
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
    suggestedLayouts: formatLayoutSuggestions(validated.panelCount),
  });
});

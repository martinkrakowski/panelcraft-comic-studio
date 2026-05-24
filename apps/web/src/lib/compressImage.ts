'use client';

const MAX_DIMENSION = 1024;
const WEBP_QUALITY = 0.8;

/**
 * Compresses an image file to WebP format with max dimensions.
 * Falls back to original file if compression fails.
 * @param file - Original image file
 * @returns Compressed WebP Blob or original file Blob
 */
export async function compressImageToWebP(file: File): Promise<Blob> {
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        const { width, height } = img;
        let newWidth = width;
        let newHeight = height;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          newWidth = Math.round(width * ratio);
          newHeight = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get canvas context'));

        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to compress image'));
          },
          'image/webp',
          WEBP_QUALITY
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  } catch (err) {
    console.warn(
      'WebP compression failed, falling back to original file:',
      err
    );
    return file as Blob;
  }
}

import { useToast } from '@panelcraft/ui';
import type { UseFormSetValue } from 'react-hook-form';
import { compressImageToWebP } from '../../../lib/compressImage';
import type { WizardFormValues } from '../../../lib/validation/wizard-schemas';
import type { WizardPersistedState } from '../../../lib/hooks';

type SaveToIndexedDB = (
  overrides?: Partial<WizardPersistedState>
) => Promise<void>;

interface UseImageUploadsProps {
  referenceImageBlobs: Record<string, Blob>;
  setReferenceImageBlobs: React.Dispatch<
    React.SetStateAction<Record<string, Blob>>
  >;
  moodBoardImageBlobs: Blob[];
  setMoodBoardImageBlobs: React.Dispatch<React.SetStateAction<Blob[]>>;
  setValue: UseFormSetValue<WizardFormValues>;
  saveToIndexedDB: SaveToIndexedDB;
}

export function useImageUploads({
  referenceImageBlobs,
  setReferenceImageBlobs,
  moodBoardImageBlobs,
  setMoodBoardImageBlobs,
  setValue,
  saveToIndexedDB,
}: UseImageUploadsProps) {
  const { toast } = useToast();

  const handleCharacterImageUpload = async (index: number, file: File) => {
    try {
      const compressed = await compressImageToWebP(file);
      const key = `char-${index}-${Date.now()}`;
      const nextBlobs = { ...referenceImageBlobs, [key]: compressed };
      setReferenceImageBlobs(nextBlobs);
      setValue(`characters.${index}.referenceImageKey`, key);
      await saveToIndexedDB({ referenceImageBlobs: nextBlobs });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Image compression failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const handleMoodBoardUpload = async (files: FileList) => {
    try {
      const compressed = await Promise.all(
        Array.from(files).map(compressImageToWebP)
      );
      const nextBlobs = [...moodBoardImageBlobs, ...compressed];
      setMoodBoardImageBlobs(nextBlobs);
      await saveToIndexedDB({ moodBoardImageBlobs: nextBlobs });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Image compression failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  return { handleCharacterImageUpload, handleMoodBoardUpload };
}

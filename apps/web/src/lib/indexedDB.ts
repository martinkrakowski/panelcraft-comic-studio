'use client';

const DB_NAME = 'comicWizard';
const STORE_NAME = 'wizardState';
const DB_VERSION = 1;

export interface WizardState {
  wizardStateVersion: 1;
  step: number;
  formValues: {
    prompt: string;
    panelCount: number;
    genres: string[];
    tones: string[];
    characters: CharacterFormValue[];
    globalStylePrompt: string;
    moodBoardPreset: string;
    artDirectionNotes?: string;
  };
  referenceImageBlobs: Record<string, Blob>; // key: character index, value: compressed WebP blob
  moodBoardImageBlobs: Blob[];
  projectId?: string;
}

export interface CharacterFormValue {
  name: string;
  role: string;
  visual: string;
  traits?: string;
  consistency: string;
  referenceImageKey?: string; // key to referenceImageBlobs
}

let dbInstance: IDBDatabase | null = null;

/** Guard for SSR environments */
const isClient = typeof window !== 'undefined';

/**
 * Run database migrations based on version number
 */
function runMigrations(
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number
): void {
  for (let v = oldVersion + 1; v <= newVersion; v++) {
    switch (v) {
      case 2:
        // Future migration: add new fields to wizard state
        // Example: migrate old form structure to new version
        console.warn('IndexedDB: migrating to version 2');
        break;
      // Add more cases for future versions
    }
  }
}

async function getDB(): Promise<IDBDatabase> {
  if (!isClient) throw new Error('IndexedDB not available on server');
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = (event as IDBVersionChangeEvent).oldVersion;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      runMigrations(db, oldVersion, DB_VERSION);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getWizardState(): Promise<WizardState | null> {
  if (!isClient) return null;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get('wizardState');

      request.onsuccess = () => resolve(request.result?.state || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function setWizardState(state: WizardState): Promise<void> {
  if (!isClient) return;

  // Check storage quota before saving blobs
  if (state.referenceImageBlobs || state.moodBoardImageBlobs.length > 0) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || Infinity;
      const percentUsed = (usage / quota) * 100;

      if (percentUsed > 80) {
        console.warn(
          `IndexedDB storage ${percentUsed.toFixed(1)}% full. Consider submitting to free up space.`
        );
      }

      // Warn if would exceed quota (approximate blob sizes)
      const blobSize =
        Object.values(state.referenceImageBlobs).reduce(
          (sum, b) => sum + b.size,
          0
        ) + state.moodBoardImageBlobs.reduce((sum, b) => sum + b.size, 0);
      if (usage + blobSize > quota) {
        throw new Error(
          'IndexedDB quota exceeded. Please submit the form or clear data.'
        );
      }
    } catch (e) {
      console.warn('Storage quota check failed:', e);
    }
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put({ id: 'wizardState', state });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Fail silently for storage errors
  }
}

export async function clearWizardState(): Promise<void> {
  if (!isClient) return;
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete('wizardState');
      tx.oncomplete = () => resolve();
    });
  } catch {
    // Fail silently
  }
}

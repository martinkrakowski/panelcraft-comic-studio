import { useRef, useCallback } from 'react';
import { setWizardState, type WizardState } from '../indexedDB';
import type { WizardFormValues } from '../validation/wizard-schemas';

export interface WizardPersistedState {
  activeStep: number;
  referenceImageBlobs: Record<string, Blob>;
  moodBoardImageBlobs: Blob[];
  preferredLayoutId: string | null;
  projectId: string | null;
}

/**
 * A custom hook to encapsulate wizard IndexedDB state persistence.
 * Uses a render-time ref synchronization pattern to avoid stale closures,
 * satisfying the "War on useEffect" FactoryAI discipline.
 *
 * @param state The current reactive state object to persist.
 * @returns An object containing the stable `save` callback.
 */
export function useWizardPersistence(state: WizardPersistedState) {
  const stateRef = useRef(state);
  stateRef.current = state; // sync on every render — safe and effect-free

  const save = useCallback(
    async (
      formValues: WizardFormValues,
      overrides?: Partial<WizardPersistedState>
    ) => {
      const current = { ...stateRef.current, ...overrides };
      const snapshot: WizardState = {
        wizardStateVersion: 1,
        step: current.activeStep,
        formValues,
        referenceImageBlobs: current.referenceImageBlobs,
        moodBoardImageBlobs: current.moodBoardImageBlobs,
        preferredLayoutId: current.preferredLayoutId || undefined,
        projectId: current.projectId || undefined,
      };
      await setWizardState(snapshot);
    },
    []
  );

  return { save };
}

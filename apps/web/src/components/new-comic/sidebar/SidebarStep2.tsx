'use client';

// @ts-nocheck

import { CollapsibleSection } from '@panelcraft/ui';
import { STYLE_PRESETS } from '../../../lib/wizard-constants';

interface SidebarStep2Props {
  moodBoardPreset: string;
  setValue: (field: string, value: unknown) => void;
  saveToIndexedDB: () => void;
}

export function SidebarStep2(props: SidebarStep2Props) {
  return <div className="p-4 text-xs text-slate-400">Step 2 Sidebar (decomposed)</div>;
}

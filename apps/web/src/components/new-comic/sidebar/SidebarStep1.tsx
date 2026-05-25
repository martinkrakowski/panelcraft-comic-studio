'use client';

// @ts-nocheck

import { CollapsibleSection } from '@panelcraft/ui';

interface SidebarStep1Props {
  fields: { id: string }[];
  characters: Record<string, unknown>[];
}

export function SidebarStep1(props: SidebarStep1Props) {
  return <div className="p-4 text-xs text-slate-400">Step 1 Sidebar (decomposed)</div>;
}

import React from 'react';
import { WizardSidebar } from '@panelcraft/ui';
import { SidebarStep0 } from './sidebar/SidebarStep0';
import { SidebarStep1 } from './sidebar/SidebarStep1';
import { SidebarStep2 } from './sidebar/SidebarStep2';

export interface NewComicWizardSidebarProps {
  activeStep: number;
  genres: string[];
  tones: string[];
  panelCount: number;
  preferredLayoutId: string | null;
  setPreferredLayoutId: (id: string | null) => void;
  setValue: any;
  saveToIndexedDB: (overrides?: any) => Promise<void>;
  register: any;
  fields: any[];
  characters: any[];
  moodBoardPreset: string;
}

export function NewComicWizardSidebar(props: NewComicWizardSidebarProps) {
  const { activeStep } = props;

  if (activeStep >= 3) return null;

  return (
    <WizardSidebar variant="flex" className="pt-20">
      {activeStep === 0 && <SidebarStep0 {...props} />}
      {activeStep === 1 && <SidebarStep1 {...props} />}
      {activeStep === 2 && <SidebarStep2 {...props} />}
    </WizardSidebar>
  );
}

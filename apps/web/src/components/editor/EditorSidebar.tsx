'use client';

import { WizardSidebar, CollapsibleSection, Badge, Progress } from '@panelcraft/ui';
import { User } from 'lucide-react';

interface SidebarCharacter {
  name: string;
  role?: string;
  visual?: string;
  traits?: string;
}

interface SidebarCharacterBible {
  characters: SidebarCharacter[];
}

interface EditorSidebarProps {
  completedPanelCount: number;
  panelCount: number;
  progressPercent: number;
  characterBible?: SidebarCharacterBible | null;
}

export function EditorSidebar({
  completedPanelCount,
  panelCount,
  progressPercent,
  characterBible,
}: EditorSidebarProps) {
  return (
    <WizardSidebar variant="flex" title="Project" className="pt-20">
      <CollapsibleSection title="Workflow Progress" defaultOpen>
        <div className="space-y-3">
          <div className="flex justify-between text-xs text-slate-400">
            <span>
              Completed: {completedPanelCount} / {panelCount} Panels
            </span>
            <span className="font-semibold text-indigo-400">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Character Bible" defaultOpen>
        <div className="text-xs text-slate-400 mb-3">
          Generated automatically to ensure scene consistency.
        </div>
        {!characterBible || characterBible.characters.length === 0 ? (
          <div className="text-center py-3 text-xs text-slate-500 italic bg-slate-800/30 rounded">
            Not generated yet. Available once outline completes.
          </div>
        ) : (
          <div className="space-y-3 divide-y divide-slate-700/50">
            {characterBible.characters.map((char, idx) => (
              <div key={char.name} className={idx === 0 ? '' : 'pt-3'}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-indigo-400" />
                    {char.name}
                  </h4>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                    {char.role}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  <span className="text-slate-500 font-semibold">Visual:</span>{' '}
                  {char.visual}
                </p>
                {char.traits && (
                  <p className="text-xs text-slate-400">
                    <span className="text-slate-500 font-semibold">
                      Traits:
                    </span>{' '}
                    {char.traits}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </WizardSidebar>
  );
}

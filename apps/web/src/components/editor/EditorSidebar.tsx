'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Progress,
} from '@panelcraft/ui';
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
    <div className="space-y-6 lg:col-span-1">
      <Card className="border-slate-800/80 bg-slate-900/40">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Workflow Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="flex justify-between text-xs text-slate-400">
            <span>
              Completed: {completedPanelCount} / {panelCount} Panels
            </span>
            <span className="font-semibold text-indigo-400">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      <Card className="border-slate-800/80 bg-slate-900/40">
        <CardHeader className="p-4 border-b border-slate-800/40">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <User className="h-4 w-4 text-indigo-400" />
            Character Bible
          </CardTitle>
          <CardDescription className="text-xs">
            Generated automatically to ensure scene consistency.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4 divide-y divide-slate-800/40">
          {!characterBible || characterBible.characters.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-500 italic">
              Not generated yet. Available once outline completes.
            </div>
          ) : (
            characterBible.characters.map((char, idx) => (
              <div
                key={char.name}
                className={`pt-4 ${idx === 0 ? 'pt-0' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{char.name}</h4>
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
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { CollapsibleSection, Badge } from '@panelcraft/ui';
import { User } from 'lucide-react';

export interface SidebarCharacter {
  name: string;
  role?: string;
  visual?: string;
  traits?: string;
  consistency?: string;
}

export interface SidebarCharacterBible {
  characters: SidebarCharacter[];
}

interface CharacterBibleSectionProps {
  characterBible?: SidebarCharacterBible | null;
}

/**
 * Per-character bible: name, role badge, visual description, traits,
 * consistency notes. Renders an "Not generated yet" placeholder when the
 * bible hasn't been produced (status before outline completes), so the
 * section never silently disappears mid-workflow.
 */
export function CharacterBibleSection({
  characterBible,
}: CharacterBibleSectionProps) {
  return (
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
            <CharacterEntry
              key={char.name}
              character={char}
              isFirst={idx === 0}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}

function CharacterEntry({
  character,
  isFirst,
}: {
  character: SidebarCharacter;
  isFirst: boolean;
}) {
  return (
    <div className={isFirst ? '' : 'pt-3'}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-indigo-400" />
          {character.name}
        </h4>
        {character.role && (
          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
            {character.role}
          </Badge>
        )}
      </div>
      {character.visual && (
        <CharacterField label="Visual" value={character.visual} />
      )}
      {character.traits && (
        <CharacterField label="Traits" value={character.traits} />
      )}
      {character.consistency && (
        <CharacterField label="Consistency" value={character.consistency} />
      )}
    </div>
  );
}

function CharacterField({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs text-slate-400 mt-1">
      <span className="text-slate-500 font-semibold">{label}:</span> {value}
    </p>
  );
}

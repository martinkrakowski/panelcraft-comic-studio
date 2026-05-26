'use client';

import React, { useState, useEffect } from 'react';
import {
  CollapsibleSection,
  Button,
  Input,
  Textarea,
  Badge,
} from '@panelcraft/ui';
import { Plus, Trash2, Edit2 } from 'lucide-react';
// Use centralized types
import type { DialogueEntry, CaptionEntry } from '@panelcraft/types';

/**
 * Placeholder / scaffolding component for the future dialogue & caption editor UI.
 *
 * This lives under overlays/ so it can be co-located with the visual primitives
 * it will eventually control.
 *
 * CURRENT STATUS (per task rules):
 * - Pure scaffolding. Uses local dummy state.
 * - Does NOT reference real project.panels[*].dialogue or displayTitle (those
 *   fields do not exist until domain VO rename + Panel schema updates land).
 * - When domain agents mark the prerequisite todos complete, this will be
 *   integrated into EditorSidebar or a per-panel inspector, wired to
 *   useEditorActions + api layer following existing patterns.
 *
 * Provides:
 * - List of current dialogue entries + captions (demo data)
 * - Add / Edit / Delete buttons (wired to local state for now)
 * - Variant selector
 * - Basic title editing surface (for displayTitle)
 *
 * JSDoc and thin-UI philosophy followed: no business rules here.
 */
interface OverlayEditorPanelProps {
  /** Panel index this inspector targets (for per-panel dialogue/captions) */
  panelIndex?: number;

  /** Controlled data from parent (project). When provided, component is "live" (no internal demo). */
  dialogue?: DialogueEntry[];
  captions?: CaptionEntry[];
  displayTitle?: string | null;

  /** Real mutation callbacks (wired to api + hook + useCase in final integration) */
  onUpdatePanelOverlays?: (updates: { dialogue?: DialogueEntry[]; captions?: CaptionEntry[] }) => void | Promise<void>;
  onUpdateDisplayTitle?: (title: string | null) => void | Promise<void>;

  // Legacy/demo callbacks kept for backward in scaffolding mode
  onAddDialogue?: (entry: Omit<DialogueEntry, 'id'>) => void;
  onUpdateDialogue?: (id: string, patch: Partial<DialogueEntry>) => void;
  onDeleteDialogue?: (id: string) => void;
  onAddCaption?: (entry: Omit<CaptionEntry, 'id'>) => void;
  onUpdateCaption?: (id: string, patch: Partial<CaptionEntry>) => void;
  onDeleteCaption?: (id: string) => void;
  onTitleChange?: (newTitle: string) => void;
}

type DemoDialogue = DialogueEntry;
type DemoCaption = CaptionEntry;

/**
 * Internal demo data so the control surface is usable and testable immediately
 * during the exploratory/scaffolding phase.
 */
const INITIAL_DEMO_DIALOGUE: DemoDialogue[] = [
  {
    id: 'd1',
    text: 'We have to stop him before it\'s too late!',
    speaker: 'HERO',
    variant: 'shout',
    position: { x: 0.65, y: 0.22 },
    tailTarget: { x: 0.35, y: 0.48 },
  },
];

const INITIAL_DEMO_CAPTIONS: DemoCaption[] = [
  {
    id: 'c1',
    text: 'THE CHASE BEGINS AT DAWN',
    variant: 'caption',
    position: { x: 0.5, y: 0.07 },
  },
];

export function OverlayEditorPanel({
  panelIndex = 0,
  dialogue: controlledDialogue,
  captions: controlledCaptions,
  displayTitle: controlledDisplayTitle,
  onUpdatePanelOverlays,
  onUpdateDisplayTitle,
  onAddDialogue,
  onUpdateDialogue,
  onDeleteDialogue,
  onAddCaption,
  onUpdateCaption,
  onDeleteCaption,
  onTitleChange,
}: OverlayEditorPanelProps) {
  // Controlled mode (preferred in integration): parent (ComicEditor) owns data from project DTO.
  // Falls back to demo state for standalone scaffolding/testing.
  const isControlled = controlledDialogue !== undefined || controlledCaptions !== undefined || controlledDisplayTitle !== undefined;

  const [demoDialogue, setDemoDialogue] = useState<DemoDialogue[]>(INITIAL_DEMO_DIALOGUE);
  const [demoCaptions, setDemoCaptions] = useState<DemoCaption[]>(INITIAL_DEMO_CAPTIONS);
  const [demoDisplayTitle, setDemoDisplayTitle] = useState('THE MIDNIGHT CHASE');

  const dialogue = isControlled ? (controlledDialogue || []) : demoDialogue;
  const captions = isControlled ? (controlledCaptions || []) : demoCaptions;
  const displayTitle = isControlled ? (controlledDisplayTitle ?? 'Untitled Comic') : demoDisplayTitle;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const persistOverlays = (nextDialogue?: DialogueEntry[], nextCaptions?: CaptionEntry[]) => {
    if (onUpdatePanelOverlays) {
      onUpdatePanelOverlays({
        dialogue: nextDialogue ?? dialogue,
        captions: nextCaptions ?? captions,
      });
    }
  };

  const persistTitle = (nextTitle: string | null) => {
    if (onUpdateDisplayTitle) {
      onUpdateDisplayTitle(nextTitle);
    } else if (onTitleChange) {
      onTitleChange(nextTitle || '');
    }
  };

  const handleAddDialogue = (variant: DemoDialogue['variant']) => {
    const newEntry: DemoDialogue = {
      id: `d${Date.now()}`,
      text: 'New dialogue...',
      speaker: 'CHARACTER',
      variant,
      position: { x: 0.5 + Math.random() * 0.2 - 0.1, y: 0.3 + Math.random() * 0.2 },
      tailTarget: { x: 0.3, y: 0.6 },
    };
    if (isControlled) {
      const next = [...dialogue, newEntry];
      persistOverlays(next);
    } else {
      setDemoDialogue((d) => [...d, newEntry]);
      onAddDialogue?.(newEntry);
    }
  };

  const handleDeleteDialogue = (id: string) => {
    if (isControlled) {
      const next = dialogue.filter((x) => x.id !== id);
      persistOverlays(next);
    } else {
      setDemoDialogue((d) => d.filter((x) => x.id !== id));
      onDeleteDialogue?.(id);
    }
    if (editingId === id) setEditingId(null);
  };

  const startEdit = (id: string, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  };

  const saveEdit = () => {
    if (!editingId) return;
    if (isControlled) {
      const nextDialogue = dialogue.map((item) => (item.id === editingId ? { ...item, text: editText } : item));
      const nextCaptions = captions.map((item) => (item.id === editingId ? { ...item, text: editText } : item));
      persistOverlays(nextDialogue, nextCaptions);
    } else {
      setDemoDialogue((d) =>
        d.map((item) => (item.id === editingId ? { ...item, text: editText } : item))
      );
      setDemoCaptions((c) =>
        c.map((item) => (item.id === editingId ? { ...item, text: editText } : item))
      );
      onUpdateDialogue?.(editingId, { text: editText });
      onUpdateCaption?.(editingId, { text: editText });
    }
    setEditingId(null);
    setEditText('');
  };

  const handleTitleSave = () => {
    const val = (isControlled ? localTitleInput : demoDisplayTitle) || null;
    persistTitle(val);
  };

  // Simple title local edit for controlled mode (input onChange updates local state,
  // explicit "Save" commits via onUpdateDisplayTitle).
  const [localTitleInput, setLocalTitleInput] = useState<string>(displayTitle ?? '');

  // Keep local input in sync when the parent-controlled displayTitle changes.
  // We intentionally need a normal effect here (not useEffectOnce or useUnmountEffect).
  // eslint-disable-next-line no-restricted-syntax
  useEffect(() => {
    if (isControlled) {
      setLocalTitleInput(displayTitle ?? '');
    }
  }, [displayTitle, isControlled]);

  return (
    <CollapsibleSection title="Overlays (Dialogue & Captions) — Scaffolding" defaultOpen={false}>
      <div className="space-y-4 text-xs">
        {/* Title editing surface (basic) */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-semibold text-slate-300">Comic Display Title</span>
            <Badge variant="outline" className="text-[9px]">Phase 3</Badge>
          </div>
          <div className="flex gap-2">
            <Input
              value={isControlled ? localTitleInput : displayTitle}
              onChange={(e) => {
                if (isControlled) setLocalTitleInput(e.target.value);
                else setDemoDisplayTitle(e.target.value);
              }}
              className="h-8 text-sm"
              placeholder="Punchy comic title"
              maxLength={120}
            />
            <Button size="sm" variant="secondary" onClick={handleTitleSave} className="px-2">
              Save
            </Button>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            Will render as clean comic lettering in CoverSlide top reserved space.
          </p>
        </div>

        {/* Dialogue entries */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-semibold text-slate-300">Dialogue Bubbles (Panel {panelIndex + 1})</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => handleAddDialogue('speech')} className="h-6 px-1.5 text-[10px]">
                <Plus className="h-3 w-3 mr-0.5" /> Speech
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleAddDialogue('thought')} className="h-6 px-1.5 text-[10px]">
                Thought
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleAddDialogue('shout')} className="h-6 px-1.5 text-[10px]">
                Shout
              </Button>
            </div>
          </div>

          {dialogue.length === 0 && (
            <div className="rounded border border-dashed border-slate-700 p-2 text-center text-slate-500 italic">
              No dialogue yet. Add bubbles above.
            </div>
          )}

          <div className="space-y-2">
            {dialogue.map((entry) => (
              <div key={entry.id} className="rounded border border-slate-700 bg-slate-950/50 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[9px] capitalize">
                        {entry.variant}
                      </Badge>
                      <span className="font-mono text-[10px] text-indigo-400/70">
                        {entry.speaker || '—'}
                      </span>
                    </div>

                    {editingId === entry.id ? (
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="mt-1 h-14 text-xs"
                        autoFocus
                      />
                    ) : (
                      <p className="mt-0.5 text-slate-200 line-clamp-2">“{entry.text}”</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    {editingId === entry.id ? (
                      <Button size="sm" onClick={saveEdit} className="h-6 px-1.5 text-[10px]">
                        Save
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(entry.id, entry.text)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteDialogue(entry.id)}
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-1 text-[9px] text-slate-500">
                  pos: ({entry.position.x.toFixed(2)}, {entry.position.y.toFixed(2)})
                  {entry.tailTarget && ' • tail set'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Captions */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-semibold text-slate-300">Captions</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const newCap: DemoCaption = {
                  id: `c${Date.now()}`,
                  text: 'NEW NARRATION...',
                  variant: 'caption',
                  position: { x: 0.5, y: 0.06 },
                };
                if (isControlled) {
                  const next = [...captions, newCap];
                  persistOverlays(undefined, next);
                } else {
                  setDemoCaptions((c) => [...c, newCap]);
                  onAddCaption?.(newCap);
                }
              }}
              className="h-6 px-1.5 text-[10px]"
            >
              <Plus className="h-3 w-3 mr-0.5" /> Add Caption
            </Button>
          </div>

          {captions.length === 0 && (
            <div className="rounded border border-dashed border-slate-700 p-2 text-center text-slate-500 italic text-xs">
              No captions.
            </div>
          )}

          {captions.map((cap) => (
            <div key={cap.id} className="mb-2 flex items-center justify-between rounded border border-amber-900/30 bg-amber-950/10 p-2 text-xs">
              <span className="italic text-amber-200 line-clamp-1">“{cap.text}”</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => startEdit(cap.id, cap.text)}>
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 text-red-400"
                  onClick={() => {
                    if (isControlled) {
                      const next = captions.filter((x) => x.id !== cap.id);
                      persistOverlays(undefined, next);
                    } else {
                      setDemoCaptions((c) => c.filter((x) => x.id !== cap.id));
                      onDeleteCaption?.(cap.id);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-slate-500 border-t border-slate-800 pt-2">
          These controls will drive <code>SpeechBubble</code> / <code>CaptionBox</code> instances inside the
          pageRef subtree. Full wiring, persistence, and real data flow gated behind VO rename + Panel schema completion.
        </p>
      </div>
    </CollapsibleSection>
  );
}

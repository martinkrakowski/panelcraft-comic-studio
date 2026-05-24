'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowLeft,
  Loader2,
  Layers,
  Plus,
  Trash2,
  PenSquare,
  ImagePlus,
  ChevronRight,
  Check,
} from 'lucide-react';
import { Button, SelectionChip } from '@panelcraft/ui';
import { Textarea } from '@panelcraft/ui';
import { useToast } from '@panelcraft/ui';
import { WizardSidebar, CollapsibleSection } from '@panelcraft/ui';
import { useCreateProject } from '../../lib/hooks/useCreateProject';
import { compressImageToWebP } from '../../lib/compressImage';
import api from '../../lib/api';
import {
  getWizardState,
  setWizardState,
  clearWizardState,
  IndexedDBQuotaExceededError,
  type WizardState,
} from '../../lib/indexedDB';
import {
  wizardFormSchema,
  promptOnlySchema,
  type WizardFormValues,
} from '../../lib/validation/wizard-schemas';
import {
  GENRE_OPTIONS,
  TONE_OPTIONS,
  STYLE_PRESETS,
  STEP_LABELS,
} from '../../lib/wizard-constants';
import { getLayoutsForPanelCount } from '../../lib/layout-templates';
import { LayoutPreview } from './LayoutPreview';
import styles from './NewComicWizard.module.css';

export function NewComicWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    createProject,
    selectLayout,
    loading: isSubmitting,
  } = useCreateProject();
  const [activeStep, setActiveStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [layoutOptions, setLayoutOptions] = useState<string[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [preferredLayoutId, setPreferredLayoutId] = useState<string | null>(
    null
  );
  const [referenceImageBlobs, setReferenceImageBlobs] = useState<
    Record<string, Blob>
  >({});
  const [moodBoardImageBlobs, setMoodBoardImageBlobs] = useState<Blob[]>([]);
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Initialize form with IndexedDB state or defaults
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<WizardFormValues>({
    resolver: zodResolver(wizardFormSchema),
    defaultValues: async () => {
      if (typeof window === 'undefined') return getDefaultValues();
      const saved = await getWizardState();
      if (saved?.wizardStateVersion === 1) {
        setActiveStep(saved.step);
        setReferenceImageBlobs(saved.referenceImageBlobs || {});
        setMoodBoardImageBlobs(saved.moodBoardImageBlobs || []);
        setPreferredLayoutId(saved.preferredLayoutId || null);
        setProjectId(saved.projectId || null);
        return saved.formValues as WizardFormValues;
      }
      return getDefaultValues();
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'characters',
  });

  const prompt = watch('prompt');
  const panelCount = watch('panelCount');
  const genres = watch('genres');
  const tones = watch('tones');
  const characters = watch('characters');
  const moodBoardPreset = watch('moodBoardPreset');

  // Keep mutable refs of state that lives in setState updaters so saveToIndexedDB
  // sees fresh values when invoked from an updater callback (which can run
  // before the corresponding re-render has happened).
  const referenceImageBlobsRef = React.useRef(referenceImageBlobs);
  const moodBoardImageBlobsRef = React.useRef(moodBoardImageBlobs);
  const preferredLayoutIdRef = React.useRef(preferredLayoutId);
  const projectIdRef = React.useRef(projectId);
  const activeStepRef = React.useRef(activeStep);
  React.useEffect(() => {
    referenceImageBlobsRef.current = referenceImageBlobs;
  }, [referenceImageBlobs]);
  React.useEffect(() => {
    moodBoardImageBlobsRef.current = moodBoardImageBlobs;
  }, [moodBoardImageBlobs]);
  React.useEffect(() => {
    preferredLayoutIdRef.current = preferredLayoutId;
  }, [preferredLayoutId]);
  React.useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);
  React.useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

  // Save to IndexedDB on form value changes. Accepts optional overrides so
  // callers (e.g. blob uploads) can pass freshly-computed values without
  // waiting for state to flush and avoid stale-closure persists.
  const saveToIndexedDB = useCallback(
    async (overrides?: {
      referenceImageBlobs?: Record<string, Blob>;
      moodBoardImageBlobs?: Blob[];
      preferredLayoutId?: string | null;
      projectId?: string | null;
      activeStep?: number;
    }) => {
      if (typeof window === 'undefined') return;
      const formData = watch();
      const refBlobs =
        overrides?.referenceImageBlobs ?? referenceImageBlobsRef.current;
      const moodBlobs =
        overrides?.moodBoardImageBlobs ?? moodBoardImageBlobsRef.current;
      const layoutId =
        overrides?.preferredLayoutId !== undefined
          ? overrides.preferredLayoutId
          : preferredLayoutIdRef.current;
      const projId =
        overrides?.projectId !== undefined
          ? overrides.projectId
          : projectIdRef.current;
      const step = overrides?.activeStep ?? activeStepRef.current;

      const state: WizardState = {
        wizardStateVersion: 1,
        step,
        formValues: {
          prompt: formData.prompt,
          panelCount: formData.panelCount,
          genres: formData.genres,
          tones: formData.tones,
          characters: formData.characters,
          globalStylePrompt: formData.globalStylePrompt,
          moodBoardPreset: formData.moodBoardPreset,
          artDirectionNotes: formData.artDirectionNotes,
        },
        referenceImageBlobs: refBlobs,
        moodBoardImageBlobs: moodBlobs,
        preferredLayoutId: layoutId || undefined,
        projectId: projId || undefined,
      };
      try {
        await setWizardState(state);
      } catch (err) {
        if (err instanceof IndexedDBQuotaExceededError) {
          toast({
            variant: 'destructive',
            title: 'Storage full',
            description: err.message,
          });
        } else {
          console.warn('Failed to persist wizard state', err);
        }
      }
    },
    [watch, toast]
  );

  // Handle next step with validation
  const handleNextStep = async () => {
    let isValid = false;
    switch (activeStep) {
      case 0:
        isValid = await trigger(['prompt', 'panelCount', 'genres', 'tones']);
        break;
      case 1:
        isValid = await trigger(['characters']);
        break;
      case 2:
        isValid = await trigger(['globalStylePrompt', 'moodBoardPreset']);
        break;
      case 3:
        isValid = true;
        break;
      default:
        isValid = false;
    }
    if (isValid) {
      await saveToIndexedDB();
      setActiveStep((prev) => Math.min(prev + 1, 4));
    }
  };

  /** Navigate to previous step */
  const handleBackStep = () => setActiveStep((prev) => Math.max(prev - 1, 0));

  /** Validate and analyze user's story prompt for genre/tone suggestions */
  const handleAnalyzePrompt = async () => {
    try {
      // Validate prompt independently without triggering full form validation
      promptOnlySchema.parse({ prompt });
    } catch (err) {
      if (err instanceof Error) {
        toast({
          variant: 'destructive',
          title: 'Validation error',
          description: err.message,
        });
      }
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await api.analyzePrompt(prompt);
      // Intersect server suggestions with our allowed option lists so the
      // sidebar pills stay in sync with the visible choices.
      const allowedGenres = GENRE_OPTIONS as readonly string[];
      const allowedTones = TONE_OPTIONS as readonly string[];
      const nextGenres = (result.suggestedGenres || [])
        .filter((g) => allowedGenres.includes(g))
        .slice(0, 3);
      const nextTones = (result.suggestedTones || [])
        .filter((t) => allowedTones.includes(t))
        .slice(0, 3);
      if (nextGenres.length > 0) setValue('genres', nextGenres);
      if (nextTones.length > 0) setValue('tones', nextTones);
      toast({
        title: 'Analysis complete',
        description: result.feedback || 'Suggested genres/tones applied',
      });
      await saveToIndexedDB();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Analysis failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Character image upload
  const handleCharacterImageUpload = async (index: number, file: File) => {
    try {
      const compressed = await compressImageToWebP(file);
      const key = `char-${index}-${Date.now()}`;
      const nextBlobs = {
        ...referenceImageBlobsRef.current,
        [key]: compressed,
      };
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

  // Mood board image upload
  const handleMoodBoardUpload = async (files: FileList) => {
    try {
      const compressed = await Promise.all(
        Array.from(files).map(compressImageToWebP)
      );
      const nextBlobs = [...moodBoardImageBlobsRef.current, ...compressed];
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

  // Submit wizard (create project)
  const onSubmit = async () => {
    try {
      const formData = watch();
      const fd = new FormData();
      fd.append('prompt', formData.prompt);
      fd.append('panelCount', String(formData.panelCount));
      fd.append('genres', JSON.stringify(formData.genres));
      fd.append('tones', JSON.stringify(formData.tones));
      fd.append(
        'characterBible',
        JSON.stringify({ characters: formData.characters })
      );
      fd.append('globalStylePrompt', formData.globalStylePrompt);
      fd.append('moodBoardPreset', formData.moodBoardPreset);
      if (formData.artDirectionNotes)
        fd.append('artDirectionNotes', formData.artDirectionNotes);

      // Append character reference images from persisted blobs with indexed field names to preserve character identity
      formData.characters.forEach((char, i) => {
        const key = char.referenceImageKey;
        if (key && referenceImageBlobs[key]) {
          fd.append(
            `referenceImages_${i}`,
            new File([referenceImageBlobs[key]], `char-${i}.webp`, {
              type: 'image/webp',
            })
          );
        }
      });

      // Append mood board images from persisted blobs
      moodBoardImageBlobs.forEach((blob, i) => {
        fd.append(
          'moodBoardImages',
          new File([blob], `mood-${i}.webp`, { type: 'image/webp' })
        );
      });

      const res = await createProject(fd);
      setProjectId(res.projectId);
      setProjectStatus(res.status);
      setActiveStep(4); // Move to layout chooser step
      await saveToIndexedDB({ projectId: res.projectId, activeStep: 4 });
      startPolling(res.projectId);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Creation failed',
        description:
          err instanceof Error ? err.message : 'Could not create project',
      });
    }
  };

  // Poll project status for layout selection
  const startPolling = (id: string) => {
    // Clear any existing polling interval to prevent multiple simultaneous pollers
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setIsPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects/${id}`
        );
        const data = await res.json();
        if (data.success) {
          setProjectStatus(data.data.project.status);
          if (data.data.project.status === 'pending_layout') {
            setLayoutOptions(data.data.project.layoutOptions || []);
            setCoverUrl(data.data.project.coverImageUrl || null);
            clearInterval(interval);
            setIsPolling(false);
          } else if (
            ['completed', 'pending_review'].includes(data.data.project.status)
          ) {
            clearInterval(interval);
            setIsPolling(false);
            router.push(`/projects/${id}`);
          }
        }
      } catch {
        // Ignore poll errors
      }
    }, 2000);
    pollingIntervalRef.current = interval;
  };

  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Memoize mood board object URLs with cleanup
  const moodBoardObjectUrls = React.useMemo(() => {
    const urls = moodBoardImageBlobs.map((blob) => URL.createObjectURL(blob));
    return urls;
  }, [moodBoardImageBlobs]);

  // Cleanup object URLs on unmount or when blobs change
  React.useEffect(() => {
    return () => {
      moodBoardObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [moodBoardObjectUrls]);

  // Handle layout selection
  const handleLayoutSelect = async (layout: string) => {
    if (!projectId) return;
    try {
      await selectLayout(projectId, layout);
      await clearWizardState();
      router.push(`/projects/${projectId}`);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Layout selection failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

      {/* Sidebar */}
      {activeStep < 3 && (
        <WizardSidebar className="pt-20">
          {/* Step 0: Genres, Tones, Panel Count, Layouts */}
          {activeStep === 0 && (
            <>
              <CollapsibleSection title="Genres" defaultOpen>
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map((genre) => (
                    <button
                      type="button"
                      key={genre}
                      aria-pressed={genres?.includes(genre)}
                      onClick={() => {
                        const current = genres || [];
                        const next = current.includes(genre)
                          ? current.filter((g) => g !== genre)
                          : [...current, genre].slice(0, 3);
                        setValue('genres', next);
                        saveToIndexedDB();
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        genres?.includes(genre)
                          ? 'bg-violet-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Tones">
                <div className="flex flex-wrap gap-2">
                  {TONE_OPTIONS.map((tone) => (
                    <button
                      type="button"
                      key={tone}
                      onClick={() => {
                        const current = tones || [];
                        const next = current.includes(tone)
                          ? current.filter((t) => t !== tone)
                          : [...current, tone].slice(0, 3);
                        setValue('tones', next);
                        saveToIndexedDB();
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        tones?.includes(tone)
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Panel Count">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-300">
                      {panelCount} panel{panelCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    {...register('panelCount', { valueAsNumber: true })}
                    onChange={() => saveToIndexedDB()}
                    className="w-full accent-violet-500"
                  />
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Recommended Layouts">
                <div className="space-y-3">
                  {getLayoutsForPanelCount(panelCount as 1 | 2 | 3 | 4).map(
                    (layout) => (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => {
                          setPreferredLayoutId(layout.id);
                          saveToIndexedDB({ preferredLayoutId: layout.id });
                        }}
                        className={`w-full flex flex-col gap-2 p-2 rounded border text-left transition-all ${
                          preferredLayoutId === layout.id
                            ? 'bg-violet-600/30 border-violet-500 ring-1 ring-violet-400/50'
                            : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-violet-500/50'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {layout.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {layout.description}
                          </p>
                        </div>
                        <LayoutPreview
                          layout={layout}
                          className="w-full h-24"
                        />
                      </button>
                    )
                  )}
                </div>
              </CollapsibleSection>
            </>
          )}

          {/* Step 1: Character summary */}
          {activeStep === 1 && (
            <CollapsibleSection title="Characters" defaultOpen>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {fields.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No characters added yet
                  </p>
                ) : (
                  fields.map((field, i) => (
                    <div
                      key={field.id}
                      className="p-2 bg-slate-800/50 rounded border border-slate-700"
                    >
                      <p className="text-xs font-semibold text-white">
                        {characters?.[i]?.name || `Character ${i + 1}`}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {characters?.[i]?.role || 'No role set'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Step 2: Style Preset */}
          {activeStep === 2 && (
            <CollapsibleSection title="Style Preset" defaultOpen>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset.id}
                    onClick={() => {
                      setValue('moodBoardPreset', preset.id);
                      saveToIndexedDB();
                    }}
                    className={`p-2 rounded border text-xs font-medium transition-colors ${
                      moodBoardPreset === preset.id
                        ? 'border-violet-500 bg-violet-500/10 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </WizardSidebar>
      )}

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col overflow-hidden ${activeStep < 3 ? 'ml-64' : ''}`}
      >
        {/* Back button */}
        <div className="flex-shrink-0 px-4 pt-4 relative z-10">
          <button
            type="button"
            onClick={() => router.push('/new')}
            className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to onboarding
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-4 flex-wrap">
          {STEP_LABELS.map((label, i) => (
            <React.Fragment key={label}>
              <div
                className={`flex items-center gap-1.5 ${i === activeStep ? 'text-white' : 'text-slate-500'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    i < activeStep
                      ? 'bg-violet-600 text-white'
                      : i === activeStep
                        ? 'bg-violet-500/20 border border-violet-500 text-violet-300'
                        : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {i < activeStep ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className="text-[10px] uppercase tracking-widest hidden sm:block">
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${i < activeStep ? 'bg-violet-500' : 'bg-slate-700'}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Hero Image & Form Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Hero Image */}
          {activeStep === 0 && (
            <div className="px-4 pb-8 flex justify-center">
              <img
                src="/tell-your-story.jpg"
                alt="Tell your story"
                className="rounded-lg"
                style={{ maxWidth: '784px', width: '100%', maxHeight: '100%' }}
              />
            </div>
          )}

          {/* Form Content */}
          <div
            className={`${styles.container} relative z-10 mx-auto max-w-2xl px-4`}
            style={{ paddingBottom: '8rem' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                {/* Step 1: Story Input */}
                {activeStep === 0 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className={styles.heroHeading}>Tell your story</h1>
                      <p className={styles.heroSubheading}>
                        Describe your comic concept in detail
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="story-prompt"
                        className="text-xs font-semibold text-slate-300 uppercase tracking-widest flex justify-between"
                      >
                        <span>Story Prompt</span>
                        <span className="text-[10px] text-slate-500">
                          {prompt?.length || 0}/1000
                        </span>
                      </label>
                      <Textarea
                        id="story-prompt"
                        aria-describedby={
                          errors.prompt ? 'prompt-error' : undefined
                        }
                        {...register('prompt')}
                        onBlur={() => saveToIndexedDB()}
                        placeholder="A futuristic detective tracking down a rogue AI in a neon-drenched city..."
                        className="h-32 resize-none bg-slate-900/30 border-slate-700 text-white"
                      />
                      {errors.prompt && (
                        <p id="prompt-error" className="text-xs text-red-400">
                          {errors.prompt.message}
                        </p>
                      )}
                      {(genres?.length > 0 || tones?.length > 0) && (
                        <div
                          className="flex gap-1.5 flex-wrap pt-1"
                          role="group"
                          aria-label="Active selections"
                        >
                          {genres.map((g) => (
                            <SelectionChip
                              key={`genres-${g}`}
                              label={g}
                              variant="genre"
                              onDismiss={() => {
                                setValue(
                                  'genres',
                                  genres.filter((x) => x !== g)
                                );
                                saveToIndexedDB();
                              }}
                            />
                          ))}
                          {tones.map((t) => (
                            <SelectionChip
                              key={`tones-${t}`}
                              label={t}
                              variant="tone"
                              onDismiss={() => {
                                setValue(
                                  'tones',
                                  tones.filter((x) => x !== t)
                                );
                                saveToIndexedDB();
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      type="button"
                      onClick={handleAnalyzePrompt}
                      disabled={isAnalyzing}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Analyze Prompt
                    </Button>
                  </div>
                )}

                {/* Step 2: Character Bible */}
                {activeStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className={styles.heroHeading}>Build your cast</h1>
                      <p className={styles.heroSubheading}>
                        Add characters with descriptions and reference images
                      </p>
                    </div>

                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="bg-slate-900/30 border border-slate-700 rounded-lg p-4 space-y-3"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-slate-300 uppercase">
                              Character {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                remove(index);
                                saveToIndexedDB();
                              }}
                              className="text-slate-500 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-slate-400 uppercase">
                                Name
                              </label>
                              <input
                                {...register(`characters.${index}.name`)}
                                onBlur={() => saveToIndexedDB()}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white"
                              />
                              {errors.characters?.[index]?.name && (
                                <p className="text-xs text-red-400">
                                  {errors.characters[index]?.name?.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 uppercase">
                                Role
                              </label>
                              <input
                                {...register(`characters.${index}.role`)}
                                onBlur={() => saveToIndexedDB()}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 uppercase">
                              Visual Description
                            </label>
                            <Textarea
                              {...register(`characters.${index}.visual`)}
                              onBlur={() => saveToIndexedDB()}
                              placeholder="Mid-40s, sharp jaw, dark trench coat..."
                              className="h-20 resize-none bg-slate-800 border border-slate-700 text-white text-sm"
                            />
                          </div>

                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              id={`char-image-${index}`}
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                e.target.files?.[0] &&
                                handleCharacterImageUpload(
                                  index,
                                  e.target.files[0]
                                )
                              }
                            />
                            <label
                              htmlFor={`char-image-${index}`}
                              className="flex items-center gap-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                            >
                              <ImagePlus className="h-4 w-4" />
                              Upload Reference Image
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      onClick={() => {
                        append({
                          name: '',
                          role: '',
                          visual: '',
                          consistency: '',
                        });
                        saveToIndexedDB();
                      }}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Character
                    </Button>
                  </div>
                )}

                {/* Step 3: Style & References */}
                {activeStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className={styles.heroHeading}>Define your style</h1>
                      <p className={styles.heroSubheading}>
                        Choose a preset and upload mood references
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
                        Style Preset
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {STYLE_PRESETS.map((preset) => (
                          <button
                            type="button"
                            key={preset.id}
                            onClick={() => {
                              setValue('moodBoardPreset', preset.id);
                              saveToIndexedDB();
                            }}
                            className={`p-3 rounded-lg border text-xs font-medium transition-colors ${
                              moodBoardPreset === preset.id
                                ? 'border-violet-500 bg-violet-500/10 text-white'
                                : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
                        Global Style Prompt
                      </label>
                      <Textarea
                        {...register('globalStylePrompt')}
                        onBlur={() => saveToIndexedDB()}
                        placeholder="Gritty noir style with high contrast, heavy shadows..."
                        className="h-24 resize-none bg-slate-900/30 border-slate-700 text-white"
                      />
                      {errors.globalStylePrompt && (
                        <p className="text-xs text-red-400">
                          {errors.globalStylePrompt.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
                        Mood Board Images
                      </label>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) =>
                          e.target.files &&
                          handleMoodBoardUpload(e.target.files)
                        }
                        className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-violet-500 file:text-white hover:file:bg-violet-600"
                      />
                      {moodBoardObjectUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {moodBoardObjectUrls.map((url, i) => (
                            <div
                              key={i}
                              className="w-16 h-16 rounded bg-slate-800 overflow-hidden"
                            >
                              <img
                                src={url}
                                alt={`Mood ${i}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 4: Review & Create */}
                {activeStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className={styles.heroHeading}>Review & Create</h1>
                      <p className={styles.heroSubheading}>
                        Confirm your settings before generating
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-slate-900/30 border border-slate-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-semibold text-white">
                            Story
                          </h3>
                          <button
                            type="button"
                            onClick={() => setActiveStep(0)}
                            className="text-xs text-violet-400 hover:text-violet-300"
                          >
                            <PenSquare className="h-3 w-3 inline mr-1" /> Edit
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {prompt}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {panelCount} panels • {genres?.join(', ')} •{' '}
                          {tones?.join(', ')}
                        </p>
                      </div>

                      <div className="bg-slate-900/30 border border-slate-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-semibold text-white">
                            Characters ({characters?.length})
                          </h3>
                          <button
                            type="button"
                            onClick={() => setActiveStep(1)}
                            className="text-xs text-violet-400 hover:text-violet-300"
                          >
                            <PenSquare className="h-3 w-3 inline mr-1" /> Edit
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {characters?.map((char, i) => (
                            <div
                              key={i}
                              className="bg-slate-800 px-3 py-1 rounded-full text-xs text-slate-300"
                            >
                              {char.name}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-slate-900/30 border border-slate-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-semibold text-white">
                            Style
                          </h3>
                          <button
                            type="button"
                            onClick={() => setActiveStep(2)}
                            className="text-xs text-violet-400 hover:text-violet-300"
                          >
                            <PenSquare className="h-3 w-3 inline mr-1" /> Edit
                          </button>
                        </div>
                        <p className="text-xs text-slate-400">
                          {moodBoardPreset} •{' '}
                          {watch('globalStylePrompt')?.slice(0, 50)}...
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleSubmit(onSubmit)}
                      disabled={isSubmitting}
                      aria-busy={isSubmitting}
                      className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:via-purple-500 hover:to-pink-500 text-white h-12"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Create Comic with Varo
                    </Button>
                  </div>
                )}

                {/* Step 5: Layout Chooser */}
                {activeStep === 4 && (
                  <div className="space-y-6 text-center">
                    {isPolling || !projectStatus ? (
                      <div className="space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-violet-500 mx-auto" />
                        <h1 className={styles.heroHeading}>
                          Varo is dreaming up your world...
                        </h1>
                        <p className="text-slate-400">
                          Generating cover and layout options
                        </p>
                      </div>
                    ) : projectStatus === 'pending_layout' ? (
                      <div className="space-y-6">
                        <h1 className={styles.heroHeading}>
                          Choose Your Layout
                        </h1>
                        {coverUrl && (
                          <div className="w-full max-w-md mx-auto rounded-lg overflow-hidden border border-slate-700">
                            <img
                              src={coverUrl}
                              alt="Cover"
                              className="w-full h-auto"
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          {layoutOptions.map((layout, i) => (
                            <button
                              type="button"
                              key={i}
                              onClick={() => handleLayoutSelect(layout)}
                              className="bg-slate-900/30 border border-slate-700 rounded-lg p-4 hover:border-violet-500 transition-colors text-left"
                            >
                              <div className="bg-slate-800 rounded h-24 mb-2 flex items-center justify-center">
                                <Layers className="h-6 w-6 text-slate-500" />
                              </div>
                              <p className="text-xs text-slate-300 font-medium">
                                {layout}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Check className="h-8 w-8 text-green-500 mx-auto" />
                        <h1 className={styles.heroHeading}>Project Created!</h1>
                        <p className="text-slate-400">
                          Redirecting to editor...
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Buttons */}
          {activeStep > 0 && activeStep < 4 && (
            <div className="flex-shrink-0 flex gap-3 justify-center px-4 py-6 border-t border-slate-700">
              <Button
                type="button"
                onClick={handleBackStep}
                className="bg-slate-800 hover:bg-slate-700 text-white"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleNextStep}
                className="bg-violet-600 hover:bg-violet-500 text-white"
              >
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getDefaultValues(): WizardFormValues {
  return {
    prompt: '',
    panelCount: 4,
    genres: [],
    tones: [],
    characters: [{ name: '', role: '', visual: '', consistency: '' }],
    globalStylePrompt: '',
    moodBoardPreset: '',
    artDirectionNotes: '',
  };
}

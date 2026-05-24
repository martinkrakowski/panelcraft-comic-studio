'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronRight, Check } from 'lucide-react';
import {
  Button,
  useToast,
  WizardSidebar,
  CollapsibleSection,
} from '@panelcraft/ui';
import { useCreateProject } from '../../lib/hooks/useCreateProject';
import { compressImageToWebP } from '../../lib/compressImage';
import {
  StoryPromptStep,
  CharacterBibleStep,
  StyleReferencesStep,
  ReviewSubmitStep,
  LayoutChooserStep,
} from './steps';
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
                {activeStep === 0 && (
                  <StoryPromptStep
                    register={register}
                    errors={errors}
                    watchPrompt={prompt}
                    watchGenres={genres}
                    watchTones={tones}
                    setValue={setValue}
                    isAnalyzing={isAnalyzing}
                    handleAnalyzePrompt={handleAnalyzePrompt}
                    saveToIndexedDB={saveToIndexedDB}
                  />
                )}

                {activeStep === 1 && (
                  <CharacterBibleStep
                    register={register}
                    errors={errors}
                    fields={fields}
                    append={append}
                    remove={remove}
                    handleCharacterImageUpload={handleCharacterImageUpload}
                    saveToIndexedDB={saveToIndexedDB}
                  />
                )}

                {activeStep === 2 && (
                  <StyleReferencesStep
                    register={register}
                    errors={errors}
                    watchMoodBoardPreset={moodBoardPreset}
                    setValue={setValue}
                    handleMoodBoardUpload={handleMoodBoardUpload}
                    moodBoardObjectUrls={moodBoardObjectUrls}
                    saveToIndexedDB={saveToIndexedDB}
                  />
                )}

                {activeStep === 3 && (
                  <ReviewSubmitStep
                    watchPrompt={prompt}
                    watchPanelCount={panelCount}
                    watchGenres={genres}
                    watchTones={tones}
                    watchCharacters={characters}
                    watchMoodBoardPreset={moodBoardPreset}
                    watchGlobalStylePrompt={watch('globalStylePrompt')}
                    setActiveStep={setActiveStep}
                    isSubmitting={isSubmitting}
                    handleSubmit={handleSubmit}
                    onSubmit={onSubmit}
                  />
                )}

                {activeStep === 4 && (
                  <LayoutChooserStep
                    isPolling={isPolling}
                    projectStatus={projectStatus}
                    coverUrl={coverUrl}
                    layoutOptions={layoutOptions}
                    handleLayoutSelect={handleLayoutSelect}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Buttons */}
          {activeStep < 4 && (
            <div className="flex-shrink-0 flex gap-3 justify-center px-4 py-6 border-t border-slate-700">
              {activeStep > 0 && (
                <Button
                  type="button"
                  onClick={handleBackStep}
                  className="bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Back
                </Button>
              )}
              {activeStep < 3 && (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-violet-600 hover:bg-violet-500 text-white"
                >
                  Next <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
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

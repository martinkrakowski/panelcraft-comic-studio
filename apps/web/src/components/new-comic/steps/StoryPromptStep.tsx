import React, { useState } from 'react';
import {
  Control,
  UseFormRegister,
  FieldErrors,
  UseFormSetValue,
  useWatch,
} from 'react-hook-form';
import { motion, type Variants } from 'framer-motion';
import {
  PenLine,
  Eraser,
  Wand2,
  Swords,
  Ghost,
  FlaskConical,
  Rocket,
} from 'lucide-react';
import { ConfirmDialog, SelectionChip, Textarea } from '@panelcraft/ui';
import { WizardFormValues } from '../../../lib/validation/wizard-schemas';
import { WizardPersistedState } from '../../../lib/hooks';
import styles from '../NewComicWizard.module.css';

export interface StoryPromptStepProps {
  control: Control<WizardFormValues>;
  register: UseFormRegister<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
  setValue: UseFormSetValue<WizardFormValues>;
  saveToIndexedDB: (overrides?: Partial<WizardPersistedState>) => Promise<void>;
}

const PROMPT_MAX = 1000;

const RANDOM_PROMPTS = [
  'A futuristic detective tracking down a rogue AI in a neon-drenched city where the boundary between virtual and reality has collapsed, and every suspect has a digital twin.',
  'A retired dragon rider receives a mysterious egg that hatches into a creature not seen for a thousand years, drawing the attention of warring kingdoms and a secret society of mage-hunters.',
  'In a world where dreams are mined as fuel, a young dreamwalker discovers a nightmare realm that threatens to consume both the sleeping and waking worlds.',
  'A crew of scavengers finds an abandoned generation ship drifting between stars. Inside, time flows differently — and something has been waiting for visitors.',
  'A street artist in near-future Tokyo discovers their graffiti portals actually open doorways to parallel dimensions, and a shadowy government agency will do anything to control them.',
  'When the ocean begins to recede worldwide, revealing ancient underwater cities, a marine biologist and a deep-sea diver uncover a civilization that never went extinct.',
];

const STARTER_IDEAS: Array<{
  title: string;
  Icon: typeof Swords;
  prompt: string;
}> = [
  {
    title: 'Wandering Samurai',
    Icon: Swords,
    prompt:
      'A lone samurai wanders a post-apocalyptic wasteland, searching for a mythical sword that can restore civilization.',
  },
  {
    title: "Alchemist's Race",
    Icon: FlaskConical,
    prompt:
      "Two rival alchemists race to discover the philosopher's stone in a steampunk Victorian London filled with clockwork automatons.",
  },
  {
    title: 'Digital Ghost',
    Icon: Ghost,
    prompt:
      "A young hacker discovers a digital ghost living inside the city's neural network and must help it escape before the corporation deletes it forever.",
  },
  {
    title: 'Alien Artifact',
    Icon: Rocket,
    prompt:
      'A retired space pilot is pulled back into service when an ancient alien artifact begins transforming the crew of a remote research station.',
  },
];

type PendingReplace = {
  next: string;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: 'destructive' | 'default';
};

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT_EXPO },
  },
};

export function StoryPromptStep({
  control,
  register,
  errors,
  setValue,
  saveToIndexedDB,
}: StoryPromptStepProps) {
  const watchPrompt = useWatch({ control, name: 'prompt' });
  const watchGenres = useWatch({ control, name: 'genres' });
  const watchTones = useWatch({ control, name: 'tones' });

  const [isFocused, setIsFocused] = useState(false);
  const [pendingReplace, setPendingReplace] = useState<PendingReplace | null>(
    null
  );

  const promptLength = watchPrompt?.length ?? 0;
  const pct = Math.min(100, (promptLength / PROMPT_MAX) * 100);
  const atLimit = pct >= 90;
  const nearLimit = !atLimit && pct >= 70;

  const applyPrompt = (next: string) => {
    setValue('prompt', next, { shouldDirty: true });
    saveToIndexedDB();
  };

  // Replace-only-if-empty / confirm-otherwise: avoids silently overwriting
  // text the user has already invested in.
  const replacePromptSafely = (action: PendingReplace) => {
    const current = watchPrompt?.trim() ?? '';
    if (!current) {
      applyPrompt(action.next);
      return;
    }
    setPendingReplace(action);
  };

  const handleClear = () => {
    replacePromptSafely({
      next: '',
      title: 'Clear story prompt?',
      description: 'Your current story prompt will be removed.',
      confirmLabel: 'Clear',
      confirmVariant: 'destructive',
    });
  };

  const handleSurpriseMe = () => {
    const next =
      RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
    replacePromptSafely({
      next,
      title: 'Replace with a random idea?',
      description:
        'Your current story prompt will be replaced with a randomly generated idea.',
      confirmLabel: 'Replace',
    });
  };

  const handlePickStarter = (prompt: string, title: string) => {
    replacePromptSafely({
      next: prompt,
      title: `Use the “${title}” starter?`,
      description:
        'Your current story prompt will be replaced with this starter idea.',
      confirmLabel: 'Use Starter',
    });
  };

  const handleConfirmReplace = () => {
    if (!pendingReplace) return;
    applyPrompt(pendingReplace.next);
    setPendingReplace(null);
  };

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <h1 className={styles.heroHeading}>
          Tell your <span className={styles.heroHeadingAccent}>story</span>
        </h1>
        <p className={styles.heroSubheading}>
          Describe your comic concept in detail
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-2">
        <div className={styles.promptGlow}>
          <div
            className={`${styles.promptCard} ${
              isFocused ? styles.promptCardFocused : ''
            }`}
          >
            <div className={styles.promptCardHeader}>
              <div className={styles.promptCardLabel}>
                <span className={styles.promptCardIcon}>
                  <PenLine className="h-3.5 w-3.5" />
                </span>
                <label
                  htmlFor="story-prompt"
                  className={styles.promptCardLabelText}
                >
                  Story Prompt
                </label>
              </div>
              <div className={styles.promptCardTools}>
                <button
                  type="button"
                  className={`${styles.promptCardTool} ${styles.hasTooltip}`}
                  onClick={handleClear}
                  disabled={promptLength === 0}
                  aria-label="Clear story prompt"
                  data-tooltip="Clear story prompt"
                >
                  <Eraser className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className={`${styles.promptCardTool} ${styles.hasTooltip}`}
                  onClick={handleSurpriseMe}
                  aria-label="Random prompt"
                  data-tooltip="Random Prompt"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <Textarea
              id="story-prompt"
              aria-describedby={errors.prompt ? 'prompt-error' : undefined}
              {...register('prompt')}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setIsFocused(false);
                saveToIndexedDB();
              }}
              maxLength={PROMPT_MAX}
              placeholder="A futuristic detective tracking down a rogue AI in a neon-drenched city..."
              className="h-32 resize-none bg-transparent border-0 px-0 py-0 text-white focus-visible:ring-0 placeholder:italic"
            />

            <div className={styles.promptCardFooter}>
              <div
                className={`${styles.charCount} ${
                  atLimit
                    ? styles.charCountAtLimit
                    : nearLimit
                      ? styles.charCountNearLimit
                      : ''
                }`}
              >
                <div className={styles.charBar}>
                  <div
                    className={`${styles.charBarFill} ${
                      atLimit
                        ? styles.charBarFillAtLimit
                        : nearLimit
                          ? styles.charBarFillNearLimit
                          : ''
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span>
                  {promptLength} / {PROMPT_MAX}
                </span>
              </div>
            </div>
          </div>
        </div>

        {errors.prompt && (
          <p id="prompt-error" className="text-xs text-red-400">
            {errors.prompt.message}
          </p>
        )}

        {(watchGenres?.length > 0 || watchTones?.length > 0) && (
          <div
            className="flex gap-1.5 flex-wrap pt-1"
            role="group"
            aria-label="Active selections"
          >
            {watchGenres.map((g) => (
              <SelectionChip
                key={`genres-${g}`}
                label={g}
                variant="genre"
                onDismiss={() => {
                  setValue(
                    'genres',
                    watchGenres.filter((x) => x !== g)
                  );
                  saveToIndexedDB();
                }}
              />
            ))}
            {watchTones.map((t) => (
              <SelectionChip
                key={`tones-${t}`}
                label={t}
                variant="tone"
                onDismiss={() => {
                  setValue(
                    'tones',
                    watchTones.filter((x) => x !== t)
                  );
                  saveToIndexedDB();
                }}
              />
            ))}
          </div>
        )}
      </motion.div>

      <motion.div variants={itemVariants}>
        <p className={styles.starterLabel}>Starter Ideas</p>
        <div className={styles.starterGrid}>
          {STARTER_IDEAS.map(({ title, Icon, prompt }) => (
            <button
              key={title}
              type="button"
              className={styles.starterCard}
              onClick={() => handlePickStarter(prompt, title)}
            >
              <Icon className={`h-3.5 w-3.5 ${styles.starterCardIcon}`} />
              <span>{title}</span>
            </button>
          ))}
        </div>
      </motion.div>

      <ConfirmDialog
        open={pendingReplace !== null}
        onOpenChange={(open) => {
          if (!open) setPendingReplace(null);
        }}
        title={pendingReplace?.title ?? ''}
        description={pendingReplace?.description}
        confirmLabel={pendingReplace?.confirmLabel ?? 'Replace'}
        confirmVariant={pendingReplace?.confirmVariant}
        onConfirm={handleConfirmReplace}
      />
    </motion.div>
  );
}

'use client';

import React, { startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lightbulb, LayoutTemplate, FolderOpen } from 'lucide-react';
import { AppCanvasCenter } from '@panelcraft/ui';
import styles from './OnboardingScreen.module.css';

type StartingMethod = 'brainstorm' | 'template' | 'load-existing';

interface TileAccent {
  r: number;
  g: number;
  b: number;
}

/** One tile in the starting-method grid. */
interface TileConfig {
  id: StartingMethod;
  label: string;
  badgeLabel: string;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
  accent: TileAccent;
}

/** Props for OnboardingScreen. Only className is forwarded (to the centered canvas inner). */
interface OnboardingScreenProps {
  className?: string;
}

const TILES: TileConfig[] = [
  {
    id: 'brainstorm',
    label: 'Brainstorm an Idea',
    badgeLabel: 'AI-Assisted',
    Icon: Lightbulb,
    accent: { r: 139, g: 92, b: 246 },
  },
  {
    id: 'template',
    label: 'Choose a Template',
    badgeLabel: 'Quick Start',
    Icon: LayoutTemplate,
    accent: { r: 6, g: 182, b: 212 },
  },
  {
    id: 'load-existing',
    label: 'Load Existing Project',
    badgeLabel: 'Continue',
    Icon: FolderOpen,
    accent: { r: 236, g: 72, b: 153 },
  },
];

const ROUTE_MAP: Record<StartingMethod, string> = {
  brainstorm: '/new/brainstorm',
  template: '/new/template',
  'load-existing': '/',
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * Onboarding screen component that presents three starting method options:
 * brainstorm, template selection, or loading an existing project.
 * Clicking a tile triggers `handleTileClick` which navigates via `router` to `ROUTE_MAP` based on the selected `StartingMethod`.
 *
 * @component
 * @param props.className - Optional className forwarded to the inner centered container.
 * @returns An animated onboarding screen JSX.Element with method selection tiles.
 */
export function OnboardingScreen({
  className,
}: OnboardingScreenProps) {
  const router = useRouter();

  function handleTileClick(method: StartingMethod) {
    startTransition(() => {
      router.push(ROUTE_MAP[method]);
    });
  }

  return (
    <AppCanvasCenter className={className}>
      <motion.div
        className={`${styles.container} relative z-10`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Step indicator */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <div className={styles.dotActive} />
          <div className={styles.dotInactive} />
          <div className={styles.dotInactive} />
          <span className="ml-2 text-[10px] text-slate-500 uppercase tracking-widest">
            Step 1 of 3
          </span>
        </motion.div>

        {/* Hero card */}
        <motion.div
          variants={itemVariants}
          className={`${styles.heroContainer} mb-6`}
        >
          <img
            src="/onboarding-hero.jpg"
            alt="Cosmic surfer"
            className={styles.heroImg}
          />
          <div className={styles.heroOverlay} />
          <div className="absolute bottom-0 left-0 p-5">
            <p className={styles.heroHeading}>Start your comic journey.</p>
            <p className={styles.heroSubheading}>
              Choose how you'd like to begin your story.
            </p>
          </div>
        </motion.div>

        {/* Tile grid */}
        <div className="grid grid-cols-3 gap-2.5 w-full">
          {TILES.map((tile, i) => {
            const { r, g, b } = tile.accent;
            return (
              <motion.button
                key={tile.id}
                type="button"
                variants={itemVariants}
                custom={i}
                onClick={() => handleTileClick(tile.id)}
                style={
                  {
                    '--tile-r': r,
                    '--tile-g': g,
                    '--tile-b': b,
                  } as React.CSSProperties
                }
                className={[
                  styles.tile,
                  'flex flex-col items-center justify-center gap-2 p-3 text-center',
                  'hover:scale-[1.02] active:scale-[0.98] transition-transform',
                ].join(' ')}
                whileTap={{ scale: 0.96 }}
              >
                <div className={styles.tileIcon}>
                  <tile.Icon size={20} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white leading-tight">
                    {tile.label}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    {tile.badgeLabel}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </AppCanvasCenter>
  );
}

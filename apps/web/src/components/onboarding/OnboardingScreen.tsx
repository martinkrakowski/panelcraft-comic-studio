'use client';

import React, { startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppCanvasCenter } from '@panelcraft/ui';
import { TILES, ROUTE_MAP, StartingMethod } from './onboarding-tiles';
import { OnboardingTile } from './OnboardingTile';
import styles from './OnboardingScreen.module.css';

/** Props for OnboardingScreen. Only className is forwarded (to the centered canvas inner). */
interface OnboardingScreenProps {
  className?: string;
}

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
export function OnboardingScreen({ className }: OnboardingScreenProps) {
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
        {/* Hero card — wrapper hosts the revolving border via three layers:
            wrapper (padding = border thickness), rotating gradient beam,
            and an inner content shield holding the actual hero image + copy. */}
        <motion.div
          variants={itemVariants}
          className={`${styles.heroContainer} mb-6`}
        >
          <div className={styles.heroBorderGradient} aria-hidden />
          <div className={styles.heroInner}>
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
          </div>
        </motion.div>

        {/* Tile grid — flex + justify-center so removing tiles keeps the
            remaining ones centered; each tile claims an equal share up to a
            sensible max so two tiles don't blow up to full-row width. */}
        <div className="flex flex-wrap justify-center gap-2.5 w-full">
          {TILES.map((tile, i) => (
            <div key={tile.id} className="flex-1 min-w-[200px] max-w-xs">
              <OnboardingTile {...tile} index={i} onSelect={handleTileClick} />
            </div>
          ))}
        </div>
      </motion.div>
    </AppCanvasCenter>
  );
}

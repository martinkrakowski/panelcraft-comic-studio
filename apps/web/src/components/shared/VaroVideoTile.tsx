'use client';

import React from 'react';
import styles from './VaroVideoTile.module.css';

interface VaroVideoTileProps {
  /** Extra classes for sizing the tile (e.g. `w-full max-w-sm`). */
  className?: string;
}

/**
 * The Varo AI logo video framed by a slowly-revolving conic-gradient border.
 * Shared by the dashboard splash and the login hero so both stay in visual
 * lockstep. The clip autoplays once (no loop), matching the splash.
 *
 * @component
 * @param props - Tile props.
 * @param props.className - Sizing classes applied to the outer frame.
 * @returns React.Element gradient-framed autoplaying logo video.
 */
export function VaroVideoTile({ className }: VaroVideoTileProps) {
  return (
    <div
      className={`${styles.videoContainer}${className ? ` ${className}` : ''}`}
    >
      <div className={styles.videoBorderGradient} aria-hidden="true" />
      <div className={styles.videoInner}>
        <video
          autoPlay
          muted
          playsInline
          aria-label="Varo AI logo"
          className={styles.video}
        >
          <source src="/varo-ai-logo.webm" type="video/webm" />
        </video>
      </div>
    </div>
  );
}

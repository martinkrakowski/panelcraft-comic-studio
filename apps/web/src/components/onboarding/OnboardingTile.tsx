'use client';

import { motion } from 'framer-motion';
import { TileConfig } from './onboarding-tiles';

interface OnboardingTileProps extends TileConfig {
  onSelect: (id: TileConfig['id']) => void;
  index: number;
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export function OnboardingTile({ id, label, badgeLabel, Icon, accent, onSelect, index }: OnboardingTileProps) {
  const { r, g, b } = accent;

  return (
    <motion.button
      type="button"
      variants={itemVariants}
      custom={index}
      onClick={() => onSelect(id)}
      style={
        {
          '--tile-r': r,
          '--tile-g': g,
          '--tile-b': b,
        } as React.CSSProperties
      }
      className={[
        'flex flex-col items-center justify-center gap-2 p-3 text-center',
        'hover:scale-[1.02] active:scale-[0.98] transition-transform',
      ].join(' ')}
      whileTap={{ scale: 0.96 }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--tile-r),var(--tile-g),var(--tile-b))]/20">
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white leading-tight">
          {label}
        </p>
        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
          {badgeLabel}
        </p>
      </div>
    </motion.button>
  );
}

'use client';

import Image from 'next/image';

/**
 * Varo AI logo + product wordmark stack. Extracted from `WorkspaceShell`
 * so the desktop header and the mobile drawer header stay in visual lock-
 * step — tweak one and both update.
 *
 * The wordmark gradient picks up a hover-tinted color when wrapped in a
 * group with `group-hover` (currently the shell `<Link href="/">`).
 */
export function BrandMark() {
  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center justify-center w-10 h-10">
        <Image
          src="/varo-ai.svg"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10"
        />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent group-hover:text-indigo-400 transition-colors duration-300">
          Varo AI
        </span>
        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider leading-none">
          PanelCraft
        </span>
      </div>
    </div>
  );
}

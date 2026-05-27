'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import {
  MobileSidebarTrigger,
  MobileSidebarDrawer,
  type MobileSidebarNavLink,
} from '@panelcraft/ui';
import { BrandMark } from './BrandMark';

interface WorkspaceShellProps {
  children: React.ReactNode;
}

const NAV_LINKS: MobileSidebarNavLink[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/new', label: 'New Comic' },
];

/**
 * Main application workspace shell wrapper that structures the layout grid.
 * Houses global navigation header, top bar metadata badge, project footer,
 * and the mobile drawer (rendered after `<main>` so portal targets from
 * `AppCanvasTwoPane` resolve in document order).
 *
 * @component
 * @param props - Component props containing the children React elements.
 * @returns A JSX.Element wrapping the application header, main layout, and footer.
 */
export function WorkspaceShell({ children }: WorkspaceShellProps) {
  return (
    <div className="h-dvh overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950 via-slate-950 to-black text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Shell */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md transition-all duration-300">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-2">
          {/* Mobile-only hamburger; renders to the left of the brand. */}
          <MobileSidebarTrigger />
          <Link href="/" scroll={false} className="group">
            <BrandMark />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 text-slate-400">
          <p>© 2026 PanelCraft Comic Studio. All rights reserved.</p>
          <p className="flex items-center gap-1.5 justify-center">
            Built for the <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span className="font-semibold text-white">
              Adobe Firefly Integration Team
            </span>
          </p>
        </div>
      </footer>

      {/* Mobile drawer. Owns the portal slot that `AppCanvasTwoPane` uses
          on < lg viewports. Rendered once, after the rest of the shell so
          its z-50 sits above the sticky z-40 header. */}
      <MobileSidebarDrawer
        brandMark={<BrandMark />}
        navLinks={NAV_LINKS}
        renderNavLink={(link, onSelect) => (
          <Link
            href={link.href}
            scroll={false}
            onClick={onSelect}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 text-center hover:bg-slate-800/60 hover:text-white"
          >
            {link.label}
          </Link>
        )}
      />
    </div>
  );
}

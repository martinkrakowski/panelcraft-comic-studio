'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Film, CheckCircle } from 'lucide-react';

interface WorkspaceShellProps {
  children: React.ReactNode;
}

/**
 * Main application workspace shell wrapper that structures the layout grid.
 * Houses global navigation header, top bar metadata badge, and project footer.
 *
 * @component
 * @param props - Component props containing the children React elements.
 * @returns A JSX.Element wrapping the application header, main layout, and footer.
 */
export function WorkspaceShell({ children }: WorkspaceShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950 via-slate-950 to-black text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Shell */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md transition-all duration-300">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              scroll={false}
              className="flex items-center space-x-3 group"
            >
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
                <Film className="h-5 w-5 text-white animate-pulse" />
                <div className="absolute -inset-0.5 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent group-hover:text-indigo-400 transition-colors duration-300">
                  PanelCraft
                </span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider leading-none">
                  Comic Studio
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Topbar Meta */}
            <div className="hidden sm:flex items-center px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/50 backdrop-blur-sm text-xs font-semibold text-slate-400 space-x-1.5 shadow-sm">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              <span>Adobe Firefly Demo</span>
            </div>
          </div>
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
    </div>
  );
}

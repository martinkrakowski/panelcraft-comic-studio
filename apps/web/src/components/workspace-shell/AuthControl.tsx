'use client';

import React, { useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
  useToast,
} from '@panelcraft/ui';
import { authLoginUrl, type AuthUser } from '../../lib/auth-client';
import { useAuth } from '../../providers/AuthProvider';

/** Two-letter initials used when no profile photo is available. */
function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'A'
  );
}

/** Profile photo when the IdP returns one (e.g. Google), else gradient initials. */
function Avatar({ user }: { user: AuthUser }) {
  const [broken, setBroken] = useState(false);
  if (user.avatarUrl && !broken) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-semibold text-white">
      {initials(user.name)}
    </span>
  );
}

function UserMenu({
  user,
  onSignOut,
}: {
  user: AuthUser;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 py-1 pl-1 pr-3 text-sm text-slate-100 backdrop-blur-sm transition-colors duration-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Avatar user={user} />
          <span className="hidden max-w-[10rem] truncate font-medium sm:inline">
            {user.name}
          </span>
          {user.demo && (
            <Badge variant="warning" className="hidden sm:inline-flex">
              Demo
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          {user.demo
            ? 'Signed in (Demo Mode)'
            : `Signed in with ${user.provider}`}
        </DropdownMenuLabel>
        <div className="px-2 pb-1.5">
          <p className="truncate text-sm font-medium text-slate-100">
            {user.name}
          </p>
          {user.email && (
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Header auth affordance: a "Sign in with {provider}" call-to-action when
 * logged out, or the signed-in user's menu when authenticated. Falls back to a
 * mock "Demo Mode" sign-in when the server has no IdP credentials.
 *
 * @component
 * @returns React.Element auth button or user menu for the workspace header.
 */
export function AuthControl() {
  const { status, user, demoMode, providerLabel, signInMock, signOut } =
    useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  if (status === 'loading') {
    return <Skeleton className="h-9 w-28 rounded-md" />;
  }

  if (status === 'authenticated' && user) {
    const handleSignOut = async () => {
      try {
        await signOut();
        toast({ title: 'Signed out', description: 'See you next time.' });
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Sign-out failed',
          description: err instanceof Error ? err.message : 'Please try again.',
        });
      }
    };
    return <UserMenu user={user} onSignOut={handleSignOut} />;
  }

  // Logged out, Demo Mode: no IdP credentials — perform the mock login inline.
  if (demoMode) {
    const handleDemo = async () => {
      setBusy(true);
      try {
        const demoUser = await signInMock();
        const firstName = demoUser.name.split(' ')[0] || demoUser.name;
        toast({
          title: `Welcome back, ${firstName}`,
          description: 'Varo is ready.',
        });
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Demo sign-in failed',
          description: err instanceof Error ? err.message : 'Please try again.',
        });
      } finally {
        setBusy(false);
      }
    };
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="hidden sm:inline-flex">
          Demo Mode
        </Badge>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={handleDemo}
        >
          <LogIn className="h-4 w-4" />
          Sign in (Demo)
        </Button>
      </div>
    );
  }

  // Logged out, provider configured: top-level navigation kicks off the OAuth flow.
  return (
    <a
      href={authLoginUrl}
      className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-indigo-600 px-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:scale-[0.98]"
    >
      <LogIn className="h-4 w-4" />
      Sign in with {providerLabel}
    </a>
  );
}

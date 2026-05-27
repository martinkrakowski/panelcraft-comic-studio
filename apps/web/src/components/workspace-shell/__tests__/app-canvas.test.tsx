/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

// Per-test control of `useIsDesktop`: hoisted spy that individual tests
// flip before rendering. Mock at the published entry so the test exercises
// the actual `AppCanvasTwoPane` against a stubbed media query.
const useIsDesktopMock = vi.fn(() => true);

vi.mock('@panelcraft/ui', async () => {
  const actual = await vi.importActual<any>('@panelcraft/ui');
  return {
    ...actual,
    useIsDesktop: () => useIsDesktopMock(),
  };
});

import {
  AppCanvasTwoPane,
  MobileSidebarProvider,
  MobileSidebarTrigger,
  MobileSidebarDrawer,
} from '@panelcraft/ui';

beforeEach(() => {
  useIsDesktopMock.mockReset();
  // Default to desktop so any test that forgets to set this hits the
  // inline-render path (the safer of the two for SSR semantics).
  useIsDesktopMock.mockReturnValue(true);

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('AppCanvasTwoPane', () => {
  it('renders the sidebar inline when no provider is present (desktop)', () => {
    useIsDesktopMock.mockReturnValue(true);
    render(
      <AppCanvasTwoPane sidebar={<div data-testid="sidebar">SIDEBAR</div>}>
        <div>MAIN</div>
      </AppCanvasTwoPane>
    );
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByText('MAIN')).toBeInTheDocument();
  });

  it('renders the sidebar inline on desktop even when a provider exists', () => {
    useIsDesktopMock.mockReturnValue(true);
    render(
      <MobileSidebarProvider>
        <MobileSidebarTrigger />
        <MobileSidebarDrawer navLinks={[{ href: '/', label: 'Dashboard' }]} />
        <AppCanvasTwoPane sidebar={<div data-testid="sidebar">SIDEBAR</div>}>
          <div>MAIN</div>
        </AppCanvasTwoPane>
      </MobileSidebarProvider>
    );

    // The sidebar should appear exactly once — inline — even though the
    // provider context is in scope.
    expect(screen.getAllByTestId('sidebar')).toHaveLength(1);
  });

  it('portals the sidebar into the drawer slot when mobile and drawer is open', async () => {
    useIsDesktopMock.mockReturnValue(false);

    render(
      <MobileSidebarProvider>
        <MobileSidebarTrigger />
        <MobileSidebarDrawer navLinks={[{ href: '/', label: 'Dashboard' }]} />
        <AppCanvasTwoPane sidebar={<div data-testid="sidebar">SIDEBAR</div>}>
          <div>MAIN</div>
        </AppCanvasTwoPane>
      </MobileSidebarProvider>
    );

    // Before the drawer opens, hasSlot is false → sidebar still renders
    // inline so its state (effects, accordion etc.) stays alive.
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /open navigation menu/i })
      );
    });

    // Once the drawer mounts, the slot ref attaches and the canvas should
    // portal the (single) sidebar instance into it. Assert via the slot
    // marker that the drawer exposes.
    const slot = document.querySelector('[data-mobile-sidebar-slot]');
    expect(slot).not.toBeNull();
    expect(slot?.contains(screen.getByTestId('sidebar'))).toBe(true);
    // Still exactly one instance — no double mount.
    expect(screen.getAllByTestId('sidebar')).toHaveLength(1);
  });
});

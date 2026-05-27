import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import {
  MobileSidebarProvider,
  MobileSidebarTrigger,
  MobileSidebarDrawer,
} from '@panelcraft/ui';

// Stub matchMedia in jsdom: defaults to mobile (matches=false for min-width
// 1024). Tests can override per case if they need desktop behavior.
beforeEach(() => {
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

describe('MobileSidebarTrigger', () => {
  it('returns null when no provider is mounted', () => {
    const { container } = render(<MobileSidebarTrigger />);
    expect(container.firstChild).toBeNull();
  });

  it('opens the drawer when clicked', async () => {
    render(
      <MobileSidebarProvider>
        <MobileSidebarTrigger />
        <MobileSidebarDrawer navLinks={[{ href: '/', label: 'Dashboard' }]} />
      </MobileSidebarProvider>
    );

    // Drawer content is portaled into document.body via Radix Portal.
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull();

    const trigger = screen.getByRole('button', {
      name: /open navigation menu/i,
    });
    await act(async () => {
      fireEvent.click(trigger);
    });

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
  });
});

describe('MobileSidebarDrawer', () => {
  it('renders the provided nav links inside the drawer', async () => {
    render(
      <MobileSidebarProvider>
        <MobileSidebarTrigger />
        <MobileSidebarDrawer
          navLinks={[
            { href: '/', label: 'Dashboard' },
            { href: '/new', label: 'New Comic' },
          ]}
        />
      </MobileSidebarProvider>
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /open navigation menu/i })
      );
    });

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'href',
      '/'
    );
    expect(screen.getByRole('link', { name: 'New Comic' })).toHaveAttribute(
      'href',
      '/new'
    );
  });

  it('closes when the close button is clicked', async () => {
    render(
      <MobileSidebarProvider>
        <MobileSidebarTrigger />
        <MobileSidebarDrawer navLinks={[{ href: '/', label: 'Dashboard' }]} />
      </MobileSidebarProvider>
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /open navigation menu/i })
      );
    });
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', {
      name: /close navigation menu/i,
    });
    await act(async () => {
      fireEvent.click(closeBtn);
    });

    // Radix may keep some aria-hidden remnants, but the visible link is gone
    // from the accessibility tree once the dialog closes.
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull();
  });

  it('uses the renderNavLink prop when provided', async () => {
    render(
      <MobileSidebarProvider>
        <MobileSidebarTrigger />
        <MobileSidebarDrawer
          navLinks={[{ href: '/new', label: 'New Comic' }]}
          renderNavLink={(link, onSelect) => (
            <a data-testid="custom-link" href={link.href} onClick={onSelect}>
              CUSTOM:{link.label}
            </a>
          )}
        />
      </MobileSidebarProvider>
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /open navigation menu/i })
      );
    });

    const custom = screen.getByTestId('custom-link');
    expect(custom).toHaveTextContent('CUSTOM:New Comic');
    expect(custom).toHaveAttribute('href', '/new');
  });
});

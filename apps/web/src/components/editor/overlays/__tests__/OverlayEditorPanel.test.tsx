/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { OverlayEditorPanel } from '../OverlayEditorPanel';

// Mock @panelcraft/ui components used by the panel
vi.mock('@panelcraft/ui', () => ({
  CollapsibleSection: ({ children, title }: any) => (
    <div data-testid="collapsible-section">
      <div>{title}</div>
      {children}
    </div>
  ),
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Input: ({ value, onChange, ...props }: any) => (
    <input value={value} onChange={onChange} {...props} />
  ),
  Textarea: ({ value, onChange, ...props }: any) => (
    <textarea value={value} onChange={onChange} {...props} />
  ),
  Badge: ({ children }: any) => <span>{children}</span>,
}));

describe('OverlayEditorPanel', () => {
  const mockOnUpdatePanelOverlays = vi.fn();
  const mockOnUpdateDisplayTitle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders in demo mode when no controlled props are passed', () => {
    render(<OverlayEditorPanel />);

    expect(screen.getByText(/Overlays \(Dialogue & Captions\)/)).toBeInTheDocument();
    expect(screen.getByText('Comic Display Title')).toBeInTheDocument();
  });

  it('uses controlled data when provided', () => {
    const controlledDialogue = [
      {
        id: 'd1',
        text: 'Hello from parent',
        variant: 'speech' as const,
        position: { x: 0.5, y: 0.5 },
      },
    ];

    render(
      <OverlayEditorPanel
        dialogue={controlledDialogue}
        onUpdatePanelOverlays={mockOnUpdatePanelOverlays}
      />
    );

    expect(screen.getByText('Hello from parent')).toBeInTheDocument();
  });

  it('calls onUpdateDisplayTitle when saving title in controlled mode', async () => {
    const user = userEvent.setup();

    render(
      <OverlayEditorPanel
        displayTitle="Initial Title"
        onUpdateDisplayTitle={mockOnUpdateDisplayTitle}
      />
    );

    const input = screen.getByPlaceholderText('Punchy comic title');
    await user.clear(input);
    await user.type(input, 'New Controlled Title');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(mockOnUpdateDisplayTitle).toHaveBeenCalledWith('New Controlled Title');
  });

  it('falls back to demo behavior when not controlled', async () => {
    const user = userEvent.setup();

    render(<OverlayEditorPanel />);

    // Should still allow adding dialogue in demo mode
    const speechButton = screen.getByRole('button', { name: /speech/i });
    await user.click(speechButton);

    // In demo mode it mutates internal state; we just verify no crash + button works
    expect(speechButton).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Minimal test to verify environment works
describe('Test Environment Check', () => {
  it('renders a simple component', () => {
    render(<div>Hello World</div>);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('mocks are applied correctly', () => {
    const mockFn = vi.fn();
    mockFn();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});

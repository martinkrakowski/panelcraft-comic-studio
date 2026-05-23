import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll } from 'vitest';

/**
 * Next.js & React Mocks
 *
 * ⚠️ NOTE: These mocks are PRE-EMPTIVE and currently dead code.
 *
 * - `next` package is NOT currently installed in this workspace
 * - `react` and `react-dom` are NOT currently installed
 * - This file was created to support future Next.js 15 integration
 *
 * When Next.js setup is activated and dependencies are installed,
 * these mocks will enable testing of Next.js-specific features like
 * useRouter, usePathname, Image component, etc.
 *
 * TODO: Activate these mocks when @panelcraft-comic-studio/web transitions to Next.js
 */

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock next/image
vi.mock('next/image', () => {
  return {
    default: (props: any) => {
      const React = require('react');
      return React.createElement('img', { ...props });
    },
  };
});

// Mock next/link
vi.mock('next/link', () => {
  return {
    default: ({ children, href }: any) => {
      const React = require('react');
      return React.createElement('a', { href }, children);
    },
  };
});

// Mock next/head
vi.mock('next/head', () => ({
  default: ({ children }: any) => children,
}));

// Suppress console errors in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

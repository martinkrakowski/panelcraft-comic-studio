import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useUnmountEffect,
  useEffectOnce,
  useObjectUrls,
  usePolling,
} from '../index';

describe('useUnmountEffect', () => {
  it('calls cleanup on unmount', () => {
    const cleanup = vi.fn();
    const { unmount } = renderHook(() => useUnmountEffect(cleanup));
    expect(cleanup).not.toHaveBeenCalled();
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

describe('useEffectOnce', () => {
  it('runs effect only once even with re-renders', () => {
    const effect = vi.fn();
    const { rerender } = renderHook(() => useEffectOnce(effect));
    expect(effect).toHaveBeenCalledTimes(1);
    rerender();
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('does not run effect again on mount remount (Strict Mode safe)', () => {
    const effect = vi.fn();
    renderHook(() => useEffectOnce(effect));
    expect(effect).toHaveBeenCalledTimes(1);
  });
});

describe('useObjectUrls', () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn((blob: Blob) => `blob:${blob.size}`);
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates object URLs for blobs', () => {
    const blob1 = new Blob(['test1'], { type: 'text/plain' });
    const blob2 = new Blob(['test2'], { type: 'text/plain' });
    const { result } = renderHook(() => useObjectUrls([blob1, blob2]));
    expect(result.current).toHaveLength(2);
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(2);
  });

  it('revokes URLs on blob change', () => {
    const blob1 = new Blob(['test'], { type: 'text/plain' });
    const blob2 = new Blob(['test2'], { type: 'text/plain' });
    const { rerender } = renderHook(({ blobs }) => useObjectUrls(blobs), {
      initialProps: { blobs: [blob1] },
    });
    rerender({ blobs: [blob2] });
    expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls callback at interval when enabled', () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, { enabled: true, intervalMs: 1000 }));
    expect(callback).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(callback).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('stops polling when disabled', () => {
    const callback = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => usePolling(callback, { enabled, intervalMs: 1000 }),
      { initialProps: { enabled: true } }
    );
    act(() => vi.advanceTimersByTime(1000));
    expect(callback).toHaveBeenCalledTimes(1);
    rerender({ enabled: false });
    act(() => vi.advanceTimersByTime(2000));
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

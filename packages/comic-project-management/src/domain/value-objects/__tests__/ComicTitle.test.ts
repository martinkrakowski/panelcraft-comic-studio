import { describe, it, expect } from 'vitest';
import { ComicTitle } from '../ComicTitle.vo';

describe('ComicTitle', () => {
  it('creates a valid title with 10-1000 characters', () => {
    const result = ComicTitle.create('A comic story of epic proportions');
    expect(result.success).toBe(true);
    expect(result.value?.getValue()).toBe('A comic story of epic proportions');
  });

  it('rejects strings shorter than 10 characters', () => {
    const result = ComicTitle.create('Too short');
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('10 and 1000');
  });

  it('rejects strings longer than 1000 characters', () => {
    const result = ComicTitle.create('a'.repeat(1001));
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('10 and 1000');
  });

  it('rejects non-string values', () => {
    const result = ComicTitle.create(123 as unknown as string);
    expect(result.success).toBe(false);
  });

  it('accepts exactly 10 characters', () => {
    const result = ComicTitle.create('1234567890');
    expect(result.success).toBe(true);
  });

  it('accepts exactly 1000 characters', () => {
    const result = ComicTitle.create('a'.repeat(1000));
    expect(result.success).toBe(true);
  });

  it('compares by value', () => {
    const title1 = ComicTitle.create('The same story').value!;
    const title2 = ComicTitle.create('The same story').value!;
    const title3 = ComicTitle.create('Different story').value!;

    expect(title1.equals(title2)).toBe(true);
    expect(title1.equals(title3)).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { ComicDisplayTitle } from '../ComicDisplayTitle.vo';

describe('ComicDisplayTitle (punchy comic title VO)', () => {
  it('creates a valid display title with 3-120 characters', () => {
    const result = ComicDisplayTitle.create('The Shadow Protocol');
    expect(result.success).toBe(true);
    expect(result.value?.getValue()).toBe('The Shadow Protocol');
  });

  it('trims whitespace on creation', () => {
    const result = ComicDisplayTitle.create('  Trimmed Title  ');
    expect(result.success).toBe(true);
    expect(result.value?.getValue()).toBe('Trimmed Title');
  });

  it('rejects strings shorter than 3 characters', () => {
    const result = ComicDisplayTitle.create('ab');
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('3–120');
  });

  it('rejects strings longer than 120 characters', () => {
    const result = ComicDisplayTitle.create('a'.repeat(121));
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('3–120');
  });

  it('rejects non-string values', () => {
    const result = ComicDisplayTitle.create(123 as unknown as string);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('must be a string');
  });

  it('accepts exactly 3 characters', () => {
    const result = ComicDisplayTitle.create('abc');
    expect(result.success).toBe(true);
  });

  it('accepts exactly 120 characters', () => {
    const result = ComicDisplayTitle.create('a'.repeat(120));
    expect(result.success).toBe(true);
  });

  it('compares by value', () => {
    const title1 = ComicDisplayTitle.create('Same Title').value!;
    const title2 = ComicDisplayTitle.create('Same Title').value!;
    const title3 = ComicDisplayTitle.create('Different').value!;

    expect(title1.equals(title2)).toBe(true);
    expect(title1.equals(title3)).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { ComicPrompt } from '../ComicPrompt.vo';

describe('ComicPrompt (long story prompt / synopsis VO)', () => {
  it('creates a valid prompt with 10-1000 characters', () => {
    const result = ComicPrompt.create('A comic story of epic proportions');
    expect(result.success).toBe(true);
    expect(result.value?.getValue()).toBe('A comic story of epic proportions');
  });

  it('rejects strings shorter than 10 characters', () => {
    const result = ComicPrompt.create('Too short');
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('10 and 1000');
  });

  it('rejects strings longer than 1000 characters', () => {
    const result = ComicPrompt.create('a'.repeat(1001));
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('10 and 1000');
  });

  it('rejects non-string values', () => {
    const result = ComicPrompt.create(123 as unknown as string);
    expect(result.success).toBe(false);
  });

  it('accepts exactly 10 characters', () => {
    const result = ComicPrompt.create('1234567890');
    expect(result.success).toBe(true);
  });

  it('accepts exactly 1000 characters', () => {
    const result = ComicPrompt.create('a'.repeat(1000));
    expect(result.success).toBe(true);
  });

  it('compares by value', () => {
    const prompt1 = ComicPrompt.create('The same story').value!;
    const prompt2 = ComicPrompt.create('The same story').value!;
    const prompt3 = ComicPrompt.create('Different story').value!;

    expect(prompt1.equals(prompt2)).toBe(true);
    expect(prompt1.equals(prompt3)).toBe(false);
  });
});

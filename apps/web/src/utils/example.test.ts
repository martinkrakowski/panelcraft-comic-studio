import { describe, it, expect } from 'vitest';

describe('Example Test Suite', () => {
  it('should demonstrate a passing test', () => {
    expect(true).toBe(true);
  });

  it('should perform basic arithmetic', () => {
    expect(1 + 1).toBe(2);
  });

  it('should work with strings', () => {
    const message = 'Hello, Vitest!';
    expect(message).toContain('Vitest');
  });
});

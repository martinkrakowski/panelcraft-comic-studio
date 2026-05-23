import { describe, it, expect } from 'vitest';

describe('Comic Generation Package', () => {
  it('should load the package entry module', async () => {
    const mod = await import('./index.js');
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThanOrEqual(0);
  });
});

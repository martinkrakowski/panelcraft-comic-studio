import { describe, it, expect } from 'vitest';
import * as domain from './index.js';

describe('Shared Package', () => {
  it('should export domain modules', () => {
    expect(domain).toBeDefined();
    expect(Object.keys(domain).length).toBeGreaterThan(0);
  });
});

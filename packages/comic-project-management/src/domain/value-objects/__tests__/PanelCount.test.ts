import { describe, it, expect } from 'vitest';
import { PanelCount } from '../PanelCount.vo';

describe('PanelCount', () => {
  it('creates valid panel counts between 1 and 20', () => {
    for (let i = 1; i <= 20; i++) {
      const result = PanelCount.create(i);
      expect(result.success).toBe(true);
      expect(result.value?.getValue()).toBe(i);
    }
  });

  it('rejects counts less than 1', () => {
    const result = PanelCount.create(0);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('1 and 20');
  });

  it('rejects counts greater than 20', () => {
    const result = PanelCount.create(21);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('1 and 20');
  });

  it('rejects non-integer values', () => {
    const result = PanelCount.create(5.5);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('integer');
  });

  it('rejects non-numeric values', () => {
    const result = PanelCount.create('5' as any);
    expect(result.success).toBe(false);
  });

  it('compares by value', () => {
    const count1 = PanelCount.create(5).value!;
    const count2 = PanelCount.create(5).value!;
    const count3 = PanelCount.create(10).value!;

    expect(count1.equals(count2)).toBe(true);
    expect(count1.equals(count3)).toBe(false);
  });
});

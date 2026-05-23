import { describe, it, expect } from 'vitest';
import { PanelStatus } from '../PanelStatus.vo';

describe('PanelStatus', () => {
  it('creates valid status values', () => {
    const statuses = ['pending', 'generated', 'completed', 'failed'];

    for (const status of statuses) {
      const result = PanelStatus.create(status);
      expect(result.success).toBe(true);
      expect(result.value?.getValue()).toBe(status);
    }
  });

  it('rejects invalid status values', () => {
    const result = PanelStatus.create('invalid-status');
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('pending');
  });

  it('rejects non-string values', () => {
    const result = PanelStatus.create(123 as any);
    expect(result.success).toBe(false);
  });

  it('compares by value', () => {
    const status1 = PanelStatus.create('pending').value!;
    const status2 = PanelStatus.create('pending').value!;
    const status3 = PanelStatus.create('completed').value!;

    expect(status1.equals(status2)).toBe(true);
    expect(status1.equals(status3)).toBe(false);
  });
});

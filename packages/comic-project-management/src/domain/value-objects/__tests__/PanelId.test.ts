import { describe, it, expect } from 'vitest';
import { PanelId } from '../PanelId.vo';

describe('PanelId', () => {
  it('creates a valid panel ID', () => {
    const result = PanelId.create('panel-1');
    expect(result.success).toBe(true);
    expect(result.value?.getValue()).toBe('panel-1');
  });

  it('rejects empty strings', () => {
    const result = PanelId.create('');
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('non-empty');
  });

  it('rejects non-string values', () => {
    const result = PanelId.create(123 as any);
    expect(result.success).toBe(false);
  });

  it('compares by value', () => {
    const id1 = PanelId.create('panel-1').value!;
    const id2 = PanelId.create('panel-1').value!;
    const id3 = PanelId.create('panel-2').value!;

    expect(id1.equals(id2)).toBe(true);
    expect(id1.equals(id3)).toBe(false);
  });
});

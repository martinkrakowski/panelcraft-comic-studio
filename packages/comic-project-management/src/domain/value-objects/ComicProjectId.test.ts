import { describe, it, expect } from 'vitest';
import { ComicProjectId } from './ComicProjectId.vo';

describe('ComicProjectId', () => {
  describe('create', () => {
    it('should successfully create a value object with a valid string ID', () => {
      const result = ComicProjectId.create('project-123');

      expect(result.success).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should wrap the provided value immutably', () => {
      const id = 'project-456';
      const result = ComicProjectId.create(id);

      expect(result.value?.getValue()).toBe(id);
    });

    it('should enforce string-typed IDs for strong typing', () => {
      const result = ComicProjectId.create('uuid-style-id-123');

      expect(result.success).toBe(true);
      expect(typeof result.value?.getValue()).toBe('string');
    });
  });

  describe('getValue', () => {
    it('should return the wrapped value', () => {
      const testId = 'test-value-123';
      const result = ComicProjectId.create(testId);

      expect(result.value?.getValue()).toBe(testId);
    });
  });

  describe('equals', () => {
    it('should return true for value objects with identical string IDs', () => {
      const id1 = ComicProjectId.create('same-id').value!;
      const id2 = ComicProjectId.create('same-id').value!;

      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for value objects with different string IDs', () => {
      const id1 = ComicProjectId.create('id-1').value!;
      const id2 = ComicProjectId.create('id-2').value!;

      expect(id1.equals(id2)).toBe(false);
    });

    it('should compare canonical string IDs only', () => {
      const id1 = ComicProjectId.create('project-uuid-abc').value!;
      const id2 = ComicProjectId.create('project-uuid-abc').value!;
      const id3 = ComicProjectId.create('project-uuid-def').value!;

      expect(id1.equals(id2)).toBe(true);
      expect(id1.equals(id3)).toBe(false);
    });
  });

});

import { describe, it, expect } from 'vitest';
import { ComicProjectId } from './ComicProjectId.vo';

describe('ComicProjectId', () => {
  describe('create', () => {
    it('should successfully create a value object with a valid ID', () => {
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

    it('should support numeric IDs', () => {
      const result = ComicProjectId.create(789);

      expect(result.success).toBe(true);
      expect(result.value?.getValue()).toBe(789);
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
    it('should return true for value objects with identical values', () => {
      const id1 = ComicProjectId.create('same-id').value!;
      const id2 = ComicProjectId.create('same-id').value!;

      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for value objects with different values', () => {
      const id1 = ComicProjectId.create('id-1').value!;
      const id2 = ComicProjectId.create('id-2').value!;

      expect(id1.equals(id2)).toBe(false);
    });

    it('should correctly compare numeric values', () => {
      const id1 = ComicProjectId.create(123).value!;
      const id2 = ComicProjectId.create(123).value!;
      const id3 = ComicProjectId.create(456).value!;

      expect(id1.equals(id2)).toBe(true);
      expect(id1.equals(id3)).toBe(false);
    });
  });

});

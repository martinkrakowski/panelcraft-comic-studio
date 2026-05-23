import { describe, it, expect } from 'vitest';
import { Character } from './Character.vo';

describe('Character', () => {
  const validCharacter = {
    name: 'Hero',
    role: 'protagonist',
    visual: 'blue costume',
    consistency: 'always brave',
  };

  it('creates a valid character with required fields', () => {
    const result = Character.create(validCharacter);
    expect(result.success).toBe(true);
    expect(result.value?.getValue().name).toBe('Hero');
  });

  it('creates a valid character with optional traits', () => {
    const result = Character.create({
      ...validCharacter,
      traits: 'has superpowers',
    });
    expect(result.success).toBe(true);
    expect(result.value?.getValue().traits).toBe('has superpowers');
  });

  it('rejects missing name', () => {
    const result = Character.create({
      ...validCharacter,
      name: '',
    });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('name');
  });

  it('rejects missing role', () => {
    const result = Character.create({
      ...validCharacter,
      role: undefined,
    });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('role');
  });

  it('rejects missing visual', () => {
    const result = Character.create({
      ...validCharacter,
      visual: '',
    });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('visual');
  });

  it('rejects missing consistency', () => {
    const result = Character.create({
      ...validCharacter,
      consistency: null,
    });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('consistency');
  });

  it('rejects non-object input', () => {
    const result = Character.create('not an object' as any);
    expect(result.success).toBe(false);
  });

  it('compares by value', () => {
    const char1 = Character.create(validCharacter).value!;
    const char2 = Character.create(validCharacter).value!;
    const char3 = Character.create({
      ...validCharacter,
      name: 'Villain',
    }).value!;

    expect(char1.equals(char2)).toBe(true);
    expect(char1.equals(char3)).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { CharacterBible } from './CharacterBible.vo';

describe('CharacterBible', () => {
  const validCharacter = {
    name: 'Hero',
    role: 'protagonist',
    visual: 'blue costume',
    consistency: 'always brave',
  };

  it('creates a character bible with valid characters array', () => {
    const result = CharacterBible.create({
      characters: [validCharacter],
    });
    expect(result.success).toBe(true);
    expect(result.value?.getCharacters()).toHaveLength(1);
  });

  it('creates a character bible with multiple characters', () => {
    const result = CharacterBible.create({
      characters: [
        validCharacter,
        { ...validCharacter, name: 'Villain', role: 'antagonist' },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.value?.getCharacters()).toHaveLength(2);
  });

  it('rejects non-object input', () => {
    const result = CharacterBible.create('not an object' as any);
    expect(result.success).toBe(false);
  });

  it('rejects missing characters array', () => {
    const result = CharacterBible.create({});
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('characters');
  });

  it('rejects invalid character in array', () => {
    const result = CharacterBible.create({
      characters: [
        validCharacter,
        { name: 'Invalid' }, // Missing required fields
      ],
    });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('characters[1]');
  });

  it('compares by value', () => {
    const bible1 = CharacterBible.create({
      characters: [validCharacter],
    }).value!;
    const bible2 = CharacterBible.create({
      characters: [validCharacter],
    }).value!;
    const bible3 = CharacterBible.create({
      characters: [{ ...validCharacter, name: 'Other' }],
    }).value!;

    expect(bible1.equals(bible2)).toBe(true);
    expect(bible1.equals(bible3)).toBe(false);
  });
});

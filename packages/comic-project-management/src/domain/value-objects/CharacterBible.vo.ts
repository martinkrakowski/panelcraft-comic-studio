import { Character, CharacterValue } from './Character.vo';

export interface CharacterBibleValue {
  characters: CharacterValue[];
}

/**
 * CharacterBible is an immutable value object.
 *
 * Value objects:
 * - Are immutable (no setters)
 * - Are compared by value, not identity
 * - Contain validation logic
 * - Can be shared safely
 *
 * @example
 * const vo = CharacterBible.create({
 *   characters: [{ name: "Hero", ... }]
 * });
 * if (vo.success) {
 *   // Use vo.value
 * }
 */
export class CharacterBible {
  /**
   * Private constructor enforces factory pattern.
   * Use CharacterBible.create() instead.
   */
  private constructor(private readonly characters: Character[]) {
    // Value is immutable after construction
  }

  /**
   * Factory method with validation.
   *
   * @param value - Raw character bible data
   * @returns Result containing CharacterBible or validation error
   */
  static create(value: unknown): { success: boolean; value?: CharacterBible; error?: Error } {
    if (!value || typeof value !== 'object') {
      return { success: false, error: new Error('CharacterBible must be an object') };
    }

    const obj = value as Record<string, unknown>;

    if (!Array.isArray(obj.characters)) {
      return { success: false, error: new Error('CharacterBible.characters must be an array') };
    }

    const characters: Character[] = [];
    for (let i = 0; i < obj.characters.length; i++) {
      const charResult = Character.create(obj.characters[i]);
      if (!charResult.success) {
        return {
          success: false,
          error: new Error(`CharacterBible.characters[${i}]: ${charResult.error?.message}`),
        };
      }
      characters.push(charResult.value!);
    }

    return { success: true, value: new CharacterBible(characters) };
  }

  /**
   * Get the wrapped value.
   */
  getValue(): CharacterBibleValue {
    return {
      characters: this.characters.map((char) => char.getValue()),
    };
  }

  /**
   * Get the character array.
   */
  getCharacters(): Character[] {
    return [...this.characters];
  }

  /**
   * Value objects are compared by value.
   */
  equals(other: CharacterBible): boolean {
    const otherChars = other.getCharacters();
    if (this.characters.length !== otherChars.length) {
      return false;
    }
    return this.characters.every((char, i) => char.equals(otherChars[i]));
  }
}

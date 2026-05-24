import { LLMResponseValidationError } from '@panelcraft/shared';

interface Character {
  name?: unknown;
  visual?: unknown;
  consistency?: unknown;
  role?: unknown;
  traits?: unknown;
}

/**
 * Application service for validating character bible data.
 * Ensures character objects have required fields and proper structure.
 */
export class CharacterBibleValidationService {
  static validate(characterData: unknown): void {
    // Validate: must be object
    if (!characterData || typeof characterData !== 'object') {
      throw new LLMResponseValidationError(
        `Character bible validation: expected object, got ${typeof characterData}`,
        {
          expected: 'object with characters array',
          received: typeof characterData,
        }
      );
    }

    const dataObj = characterData as Record<string, unknown>;

    // Validate: must have characters array
    if (!Array.isArray(dataObj.characters)) {
      throw new LLMResponseValidationError(
        `Character bible validation: expected { characters: [...] } structure`,
        {
          expected: 'characters array',
          received: Object.keys(dataObj).join(', '),
        }
      );
    }

    // Validate: each character has required fields
    for (let i = 0; i < dataObj.characters.length; i++) {
      const char = dataObj.characters[i];
      if (!char || typeof char !== 'object' || Array.isArray(char)) {
        throw new LLMResponseValidationError(
          `Character bible validation: character ${i} must be an object`,
          { expected: 'character object', received: char }
        );
      }

      const charObj = char as Character;
      const requiredFields = ['name', 'visual', 'consistency'];
      const missingFields = requiredFields.filter(
        (f) => !charObj[f as keyof Character]
      );

      if (missingFields.length > 0) {
        console.warn(
          `[Warning] Character ${i} missing fields: ${missingFields.join(', ')}. Has: ${Object.keys(charObj).join(', ')}`
        );
      }
    }
  }
}

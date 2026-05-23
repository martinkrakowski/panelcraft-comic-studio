export interface CharacterValue {
  name: string;
  role: string;
  visual: string;
  traits?: string;
  consistency: string;
}

/**
 * Character is an immutable value object.
 *
 * Value objects:
 * - Are immutable (no setters)
 * - Are compared by value, not identity
 * - Contain validation logic
 * - Can be shared safely
 *
 * @example
 * const vo = Character.create({
 *   name: "Hero",
 *   role: "protagonist",
 *   visual: "blue costume",
 *   consistency: "always brave"
 * });
 * if (vo.success) {
 *   // Use vo.value
 * }
 */
export class Character {
  /**
   * Private constructor enforces factory pattern.
   * Use Character.create() instead.
   */
  private constructor(private readonly data: CharacterValue) {
    // Value is immutable after construction
  }

  /**
   * Factory method with validation.
   *
   * @param value - Raw character data
   * @returns Result containing Character or validation error
   */
  static create(value: unknown): { success: boolean; value?: Character; error?: Error } {
    if (!value || typeof value !== 'object') {
      return { success: false, error: new Error('Character must be an object') };
    }

    const obj = value as Record<string, unknown>;

    if (typeof obj.name !== 'string' || obj.name.length === 0) {
      return { success: false, error: new Error('Character.name must be a non-empty string') };
    }

    if (typeof obj.role !== 'string' || obj.role.length === 0) {
      return { success: false, error: new Error('Character.role must be a non-empty string') };
    }

    if (typeof obj.visual !== 'string' || obj.visual.length === 0) {
      return { success: false, error: new Error('Character.visual must be a non-empty string') };
    }

    if (typeof obj.consistency !== 'string' || obj.consistency.length === 0) {
      return { success: false, error: new Error('Character.consistency must be a non-empty string') };
    }

    const data: CharacterValue = {
      name: obj.name,
      role: obj.role,
      visual: obj.visual,
      consistency: obj.consistency,
    };

    if (typeof obj.traits === 'string') {
      data.traits = obj.traits;
    } else if (obj.traits !== undefined) {
      return { success: false, error: new Error('Character.traits must be a string or undefined') };
    }

    return { success: true, value: new Character(data) };
  }

  /**
   * Get the wrapped value.
   */
  getValue(): CharacterValue {
    return { ...this.data };
  }

  /**
   * Value objects are compared by value.
   */
  equals(other: Character): boolean {
    const otherData = other.getValue();
    return (
      this.data.name === otherData.name &&
      this.data.role === otherData.role &&
      this.data.visual === otherData.visual &&
      this.data.consistency === otherData.consistency &&
      this.data.traits === otherData.traits
    );
  }
}

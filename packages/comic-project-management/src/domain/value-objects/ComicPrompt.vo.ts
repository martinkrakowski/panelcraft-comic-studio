// @generated value-object stub — edit freely
/**
 * ComicPrompt is an immutable value object representing the user's full story prompt / synopsis
 * (the long-form input that drives character bible extraction, panel breakdown, and image generation).
 *
 * It is NOT the short display title (see ComicDisplayTitle for that).
 *
 * Value objects:
 * - Are immutable (no setters)
 * - Are compared by value, not identity
 * - Contain validation logic
 * - Can be shared safely
 *
 * Validation: 10–1000 characters (trimmed length not enforced beyond raw for simplicity; callers trim if needed).
 *
 * @example
 * const vo = ComicPrompt.create(rawValue);
 * if (vo.success) {
 *   // Use vo.value
 * }
 */
export class ComicPrompt {
  /**
   * Private constructor enforces factory pattern.
   * Use ComicPrompt.create() instead.
   */
  private constructor(private readonly value: string) {
    // Value is immutable after construction
  }

  /**
   * Factory method with validation for the long story prompt.
   *
   * @param value - Raw value to wrap (user's story synopsis/prompt)
   * @returns Result containing ComicPrompt or validation error
   */
  static create(value: unknown): { success: boolean; value?: ComicPrompt; error?: Error } {
    if (typeof value !== 'string') {
      return { success: false, error: new Error('ComicPrompt must be a string') };
    }
    if (value.length < 10 || value.length > 1000) {
      return { success: false, error: new Error('ComicPrompt must be between 10 and 1000 characters') };
    }
    return { success: true, value: new ComicPrompt(value) };
  }

  /**
   * Get the wrapped value (the long story prompt / synopsis).
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Value objects are compared by value.
   */
  equals(other: ComicPrompt): boolean {
    return this.value === other.value;
  }
}

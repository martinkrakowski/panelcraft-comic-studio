// @generated value-object stub — edit freely
/**
 * ComicTitle is an immutable value object.
 *
 * Value objects:
 * - Are immutable (no setters)
 * - Are compared by value, not identity
 * - Contain validation logic
 * - Can be shared safely
 *
 * @example
 * const vo = ComicTitle.create(rawValue);
 * if (vo.success) {
 *   // Use vo.value
 * }
 */
export class ComicTitle {
  /**
   * Private constructor enforces factory pattern.
   * Use ComicTitle.create() instead.
   */
  private constructor(private readonly value: string) {
    // Value is immutable after construction
  }

  /**
   * Factory method with validation.
   *
   * @param value - Raw value to wrap
   * @returns Result containing ComicTitle or validation error
   */
  static create(value: unknown): { success: boolean; value?: ComicTitle; error?: Error } {
    if (typeof value !== 'string') {
      return { success: false, error: new Error('ComicTitle must be a string') };
    }
    if (value.length < 10 || value.length > 1000) {
      return { success: false, error: new Error('ComicTitle must be between 10 and 1000 characters') };
    }
    return { success: true, value: new ComicTitle(value) };
  }

  /**
   * Get the wrapped value.
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Value objects are compared by value.
   */
  equals(other: ComicTitle): boolean {
    return this.value === other.value;
  }
}

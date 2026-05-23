// @generated value-object stub — edit freely
/**
 * ComicGenre is an immutable value object.
 *
 * Value objects:
 * - Are immutable (no setters)
 * - Are compared by value, not identity
 * - Contain validation logic
 * - Can be shared safely
 *
 * @example
 * const vo = ComicGenre.create(rawValue);
 * if (vo.success) {
 *   // Use vo.value
 * }
 */
export class ComicGenre {
  /**
   * Private constructor enforces factory pattern.
   * Use ComicGenre.create() instead.
   */
  private constructor(private readonly value: unknown) {
    // Value is immutable after construction
  }

  /**
   * Factory method with validation.
   *
   * @param value - Raw value to wrap
   * @returns Result containing ComicGenre or validation error
   *
   * TODO: Implement validation logic
   * Example:
   * static create(value: string): Result<ComicGenre, Error> {
   *   if (!value || value.length === 0) {
   *     return { success: false, error: new Error('Value cannot be empty') };
   *   }
   *   return { success: true, value: new ComicGenre(value) };
   * }
   */
  static create(value: unknown): { success: boolean; value?: ComicGenre; error?: Error } {
    // TODO: Add validation
    return { success: true, value: new ComicGenre(value) };
  }

  /**
   * Get the wrapped value.
   */
  getValue(): unknown {
    return this.value;
  }

  /**
   * Value objects are compared by value.
   */
  equals(other: ComicGenre): boolean {
    return this.value === other.value;
  }
}

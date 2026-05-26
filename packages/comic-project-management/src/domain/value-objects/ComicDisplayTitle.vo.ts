// @generated value-object stub — edit freely
/**
 * ComicDisplayTitle is an immutable value object representing the short, user-facing
 * "display title" or "cover title" for a comic project (e.g. "The Shadow Protocol").
 *
 * This is distinct from the long story `ComicPrompt` (the full user synopsis that drives
 * generation). ComicDisplayTitle is punchy, suitable for UI headers, cover overlays,
 * project lists, and exports.
 *
 * Typical length: 3–80 chars; enforced 3–120 to allow flexibility while staying "title-like".
 *
 * Value objects:
 * - Are immutable (no setters)
 * - Are compared by value, not identity
 * - Contain validation logic
 * - Can be shared safely
 *
 * @example
 * const result = ComicDisplayTitle.create('The Last Panel');
 * if (result.success) {
 *   console.log(result.value!.getValue()); // 'The Last Panel'
 * }
 */
export class ComicDisplayTitle {
  /**
   * Private constructor enforces factory pattern.
   * Use ComicDisplayTitle.create() instead.
   */
  private constructor(private readonly value: string) {
    // Value is immutable after construction
  }

  /**
   * Factory method with validation for punchy comic display titles.
   *
   * @param value - Raw string value (will be trimmed)
   * @returns Result containing ComicDisplayTitle or validation error.
   *          Error messages are user-friendly for form validation.
   */
  static create(value: unknown): { success: boolean; value?: ComicDisplayTitle; error?: Error } {
    if (typeof value !== 'string') {
      return { success: false, error: new Error('ComicDisplayTitle must be a string') };
    }
    const trimmed = value.trim();
    if (trimmed.length < 3 || trimmed.length > 120) {
      return { success: false, error: new Error('ComicDisplayTitle must be 3–120 characters') };
    }
    // Future: could add title-casing normalization or allow-list here, but keep simple for now.
    return { success: true, value: new ComicDisplayTitle(trimmed) };
  }

  /**
   * Get the wrapped, trimmed display title string.
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Value objects are compared by value (case-sensitive exact match after trim).
   */
  equals(other: ComicDisplayTitle): boolean {
    return this.value === other.value;
  }
}

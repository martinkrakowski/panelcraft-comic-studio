// @generated value-object stub — edit freely
/**
 * PanelId is an immutable value object.
 *
 * Value objects:
 * - Are immutable (no setters)
 * - Are compared by value, not identity
 * - Contain validation logic
 * - Can be shared safely
 *
 * @example
 * const vo = PanelId.create(rawValue);
 * if (vo.success) {
 *   // Use vo.value
 * }
 */
export class PanelId {
  /**
   * Private constructor enforces factory pattern.
   * Use PanelId.create() instead.
   */
  private constructor(private readonly value: string) {
    // Value is immutable after construction
  }

  /**
   * Factory method with validation.
   *
   * @param value - Raw value to wrap
   * @returns Result containing PanelId or validation error
   */
  static create(value: unknown): { success: boolean; value?: PanelId; error?: Error } {
    if (typeof value !== 'string' || value.length === 0) {
      return { success: false, error: new Error('PanelId must be a non-empty string') };
    }
    return { success: true, value: new PanelId(value) };
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
  equals(other: PanelId): boolean {
    return this.value === other.value;
  }
}

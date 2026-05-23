// @generated value-object stub — edit freely
/**
 * PanelCount is an immutable value object.
 *
 * Value objects:
 * - Are immutable (no setters)
 * - Are compared by value, not identity
 * - Contain validation logic
 * - Can be shared safely
 *
 * @example
 * const vo = PanelCount.create(5);
 * if (vo.success) {
 *   // Use vo.value
 * }
 */
export class PanelCount {
  private static readonly MIN_PANELS = 1;
  private static readonly MAX_PANELS = 20;

  /**
   * Private constructor enforces factory pattern.
   * Use PanelCount.create() instead.
   */
  private constructor(private readonly value: number) {
    // Value is immutable after construction
  }

  /**
   * Factory method with validation.
   *
   * @param value - Raw value to wrap
   * @returns Result containing PanelCount or validation error
   */
  static create(value: unknown): { success: boolean; value?: PanelCount; error?: Error } {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return { success: false, error: new Error('PanelCount must be an integer') };
    }
    if (value < PanelCount.MIN_PANELS || value > PanelCount.MAX_PANELS) {
      return { success: false, error: new Error(`PanelCount must be between ${PanelCount.MIN_PANELS} and ${PanelCount.MAX_PANELS}`) };
    }
    return { success: true, value: new PanelCount(value) };
  }

  /**
   * Get the wrapped value.
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Value objects are compared by value.
   */
  equals(other: PanelCount): boolean {
    return this.value === other.value;
  }
}

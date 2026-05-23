// @generated value-object stub — edit freely
/**
 * PanelStatus is an immutable value object.
 *
 * Value objects:
 * - Are immutable (no setters)
 * - Are compared by value, not identity
 * - Contain validation logic
 * - Can be shared safely
 *
 * @example
 * const vo = PanelStatus.create(rawValue);
 * if (vo.success) {
 *   // Use vo.value
 * }
 */
export type PanelStatusValue = 'pending' | 'generated' | 'completed' | 'failed';

export class PanelStatus {
  private static readonly VALID_STATUSES: PanelStatusValue[] = ['pending', 'generated', 'completed', 'failed'];

  /**
   * Private constructor enforces factory pattern.
   * Use PanelStatus.create() instead.
   */
  private constructor(private readonly value: PanelStatusValue) {
    // Value is immutable after construction
  }

  /**
   * Factory method with validation.
   *
   * @param value - Raw value to wrap
   * @returns Result containing PanelStatus or validation error
   */
  static create(value: unknown): { success: boolean; value?: PanelStatus; error?: Error } {
    if (typeof value !== 'string' || !PanelStatus.VALID_STATUSES.includes(value as PanelStatusValue)) {
      return { success: false, error: new Error(`PanelStatus must be one of: ${PanelStatus.VALID_STATUSES.join(', ')}`) };
    }
    return { success: true, value: new PanelStatus(value as PanelStatusValue) };
  }

  /**
   * Get the wrapped value.
   */
  getValue(): PanelStatusValue {
    return this.value;
  }

  /**
   * Value objects are compared by value.
   */
  equals(other: PanelStatus): boolean {
    return this.value === other.value;
  }
}

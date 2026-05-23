// @generated value-object stub — edit freely

/**
 * Shape of the resume value provided by the human when approving or rejecting a panel.
 * This is what the caller passes when resuming the LangGraph thread after an interrupt.
 */
export interface HITLFeedbackData {
  approved: boolean;
  comment?: string;
  regenerationHint?: string;
}

/**
 * HITLFeedback is an immutable value object.
 *
 * Value objects:
 * - Are immutable (no setters)
 * - Are compared by value, not identity
 * - Contain validation logic
 * - Can be shared safely
 *
 * @example
 * const vo = HITLFeedback.create(rawValue);
 * if (vo.success) {
 *   // Use vo.value
 * }
 */
export class HITLFeedback {
  /**
   * Private constructor enforces factory pattern.
   * Use HITLFeedback.create() instead.
   */
  private constructor(private readonly value: unknown) {
    // Value is immutable after construction
  }

  /**
   * Factory method with validation.
   *
   * @param value - Raw value to wrap
   * @returns Result containing HITLFeedback or validation error
   *
   * TODO: Implement validation logic
   * Example:
   * static create(value: string): Result<HITLFeedback, Error> {
   *   if (!value || value.length === 0) {
   *     return { success: false, error: new Error('Value cannot be empty') };
   *   }
   *   return { success: true, value: new HITLFeedback(value) };
   * }
   */
  static create(value: unknown): { success: boolean; value?: HITLFeedback; error?: Error } {
    // TODO: Add validation
    return { success: true, value: new HITLFeedback(value) };
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
  equals(other: HITLFeedback): boolean {
    return this.value === other.value;
  }
}

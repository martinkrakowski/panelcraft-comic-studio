export interface FeedbackEntryValue {
  approved: boolean;
  comment?: string;
  regenerationHint?: string;
}

/**
 * FeedbackEntry is an immutable value object.
 *
 * Value objects:
 * - Are immutable (no setters)
 * - Are compared by value, not identity
 * - Contain validation logic
 * - Can be shared safely
 *
 * @example
 * const vo = FeedbackEntry.create({
 *   approved: true,
 *   comment: "Looks good"
 * });
 * if (vo.success) {
 *   // Use vo.value
 * }
 */
export class FeedbackEntry {
  /**
   * Private constructor enforces factory pattern.
   * Use FeedbackEntry.create() instead.
   */
  private constructor(private readonly data: FeedbackEntryValue) {
    // Value is immutable after construction
  }

  /**
   * Factory method with validation.
   *
   * @param value - Raw feedback entry data
   * @returns Result containing FeedbackEntry or validation error
   */
  static create(value: unknown): { success: boolean; value?: FeedbackEntry; error?: Error } {
    if (!value || typeof value !== 'object') {
      return { success: false, error: new Error('FeedbackEntry must be an object') };
    }

    const obj = value as Record<string, unknown>;

    if (typeof obj.approved !== 'boolean') {
      return { success: false, error: new Error('FeedbackEntry.approved must be a boolean') };
    }

    const data: FeedbackEntryValue = {
      approved: obj.approved,
    };

    if (typeof obj.comment === 'string') {
      data.comment = obj.comment;
    } else if (obj.comment !== undefined) {
      return { success: false, error: new Error('FeedbackEntry.comment must be a string or undefined') };
    }

    if (typeof obj.regenerationHint === 'string') {
      data.regenerationHint = obj.regenerationHint;
    } else if (obj.regenerationHint !== undefined) {
      return { success: false, error: new Error('FeedbackEntry.regenerationHint must be a string or undefined') };
    }

    return { success: true, value: new FeedbackEntry(data) };
  }

  /**
   * Get the wrapped value.
   */
  getValue(): FeedbackEntryValue {
    return { ...this.data };
  }

  /**
   * Value objects are compared by value.
   */
  equals(other: FeedbackEntry): boolean {
    const otherData = other.getValue();
    return (
      this.data.approved === otherData.approved &&
      this.data.comment === otherData.comment &&
      this.data.regenerationHint === otherData.regenerationHint
    );
  }
}

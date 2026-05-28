/**
 * OwnerId is an immutable value object identifying the owner of a comic
 * project. The value is a deterministic UUID derived from the authenticated
 * OAuth identity (see the API's `deriveOwnerId`). Modeling it as a value
 * object — rather than a bare string — keeps it from being mixed up with other
 * identifiers as it flows through the application and persistence ports.
 *
 * Value objects:
 * - Are immutable (no setters)
 * - Are compared by value, not identity
 * - Contain validation logic
 *
 * @example
 * const vo = OwnerId.create(rawValue);
 * if (vo.success) {
 *   // Use vo.value
 * }
 */
export class OwnerId {
  /** Private constructor enforces the factory pattern. Use OwnerId.create(). */
  private constructor(private readonly value: string) {}

  /**
   * Factory with validation.
   *
   * @param value - Raw value to wrap (expected: a UUID-shaped identifier).
   * @returns Result containing the OwnerId or a validation error.
   */
  static create(value: unknown): {
    success: boolean;
    value?: OwnerId;
    error?: Error;
  } {
    if (typeof value !== 'string' || value.length === 0) {
      return {
        success: false,
        error: new Error('OwnerId must be a non-empty string'),
      };
    }
    if (!/^[a-zA-Z0-9-]+$/.test(value)) {
      return {
        success: false,
        error: new Error(
          'OwnerId must contain only alphanumeric characters and hyphens'
        ),
      };
    }
    return { success: true, value: new OwnerId(value) };
  }

  /** Get the wrapped value. */
  getValue(): string {
    return this.value;
  }

  /** Value objects are compared by value. */
  equals(other: OwnerId): boolean {
    return this.value === other.value;
  }
}

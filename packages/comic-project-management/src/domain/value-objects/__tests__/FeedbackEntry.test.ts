import { describe, it, expect } from 'vitest';
import { FeedbackEntry } from '../FeedbackEntry.vo';

describe('FeedbackEntry', () => {
  it('creates a feedback entry with approved=true', () => {
    const result = FeedbackEntry.create({
      approved: true,
    });
    expect(result.success).toBe(true);
    expect(result.value?.getValue().approved).toBe(true);
  });

  it('creates a feedback entry with approved=false', () => {
    const result = FeedbackEntry.create({
      approved: false,
    });
    expect(result.success).toBe(true);
    expect(result.value?.getValue().approved).toBe(false);
  });

  it('creates a feedback entry with optional comment', () => {
    const result = FeedbackEntry.create({
      approved: true,
      comment: 'Looks great!',
    });
    expect(result.success).toBe(true);
    expect(result.value?.getValue().comment).toBe('Looks great!');
  });

  it('creates a feedback entry with optional regenerationHint', () => {
    const result = FeedbackEntry.create({
      approved: false,
      regenerationHint: 'Make it more dynamic',
    });
    expect(result.success).toBe(true);
    expect(result.value?.getValue().regenerationHint).toBe(
      'Make it more dynamic'
    );
  });

  it('creates a feedback entry with both comment and regenerationHint', () => {
    const result = FeedbackEntry.create({
      approved: false,
      comment: 'Not quite right',
      regenerationHint: 'Try again with more detail',
    });
    expect(result.success).toBe(true);
    const value = result.value!.getValue();
    expect(value.comment).toBe('Not quite right');
    expect(value.regenerationHint).toBe('Try again with more detail');
  });

  it('rejects non-object input', () => {
    const result = FeedbackEntry.create('not an object' as unknown);
    expect(result.success).toBe(false);
  });

  it('rejects missing approved field', () => {
    const result = FeedbackEntry.create({
      comment: 'Some comment',
    } as unknown);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('approved');
  });

  it('rejects non-boolean approved value', () => {
    const result = FeedbackEntry.create({
      approved: 'yes',
    } as unknown);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('approved');
  });

  it('rejects non-string comment', () => {
    const result = FeedbackEntry.create({
      approved: true,
      comment: 123,
    } as unknown);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('comment');
  });

  it('rejects non-string regenerationHint', () => {
    const result = FeedbackEntry.create({
      approved: true,
      regenerationHint: { hint: 'test' },
    } as unknown);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('regenerationHint');
  });

  it('compares by value', () => {
    const feedback1 = FeedbackEntry.create({
      approved: true,
      comment: 'Good',
    }).value!;
    const feedback2 = FeedbackEntry.create({
      approved: true,
      comment: 'Good',
    }).value!;
    const feedback3 = FeedbackEntry.create({
      approved: false,
      comment: 'Good',
    }).value!;

    expect(feedback1.equals(feedback2)).toBe(true);
    expect(feedback1.equals(feedback3)).toBe(false);
  });
});

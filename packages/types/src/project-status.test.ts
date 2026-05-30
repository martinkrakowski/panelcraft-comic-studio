import { describe, it, expect } from 'vitest';
import { projectStatusBucket, type ProjectStatus } from './index.js';

describe('projectStatusBucket', () => {
  const cases: [ProjectStatus, string][] = [
    ['completed', 'completed'],
    ['failed', 'failed'],
    ['pending_review', 'review'],
    ['pending_review_extend', 'review'],
    ['pending_review_final', 'review'],
    ['pending_review_cover', 'review'],
    ['created', 'in_progress'],
    ['pending_creation', 'in_progress'],
    ['processing', 'in_progress'],
    ['pending_layout', 'in_progress'],
    ['extending', 'in_progress'],
    ['composing', 'in_progress'],
    ['regenerating_cover', 'in_progress'],
  ];

  it.each(cases)('classifies %s as %s', (status, bucket) => {
    expect(projectStatusBucket(status)).toBe(bucket);
  });
});

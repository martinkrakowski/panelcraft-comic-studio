interface JobPayload {
  [key: string]: unknown;
}

interface JobOptions {
  attempts?: number;
  backoff?: {
    type: string;
    delay: number;
  };
  removeOnComplete?: boolean;
  [key: string]: unknown;
}

/**
 * JobQueuePort defines the contract for asynchronous job queue operations.
 *
 * This is an outbound port in the Hexagonal Architecture pattern.
 * Implement this interface in your infrastructure adapter (e.g., BullMQ).
 */
export interface JobQueuePort {
  /**
   * Enqueue a job for asynchronous processing.
   * @param jobName The name of the job type
   * @param data Job payload
   * @param options Optional job configuration (retries, backoff, etc.)
   */
  add(jobName: string, data: JobPayload, options?: JobOptions): Promise<void>;
}

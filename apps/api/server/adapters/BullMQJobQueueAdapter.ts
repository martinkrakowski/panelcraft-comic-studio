import { Queue } from 'bullmq';
import type { JobQueuePort } from '@panelcraft/comic-generation';

/**
 * BullMQ implementation of JobQueuePort.
 * Adapts BullMQ Queue to the JobQueuePort interface.
 */
export class BullMQJobQueueAdapter implements JobQueuePort {
  constructor(private readonly queue: Queue) {}

  async add(
    jobName: string,
    data: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<void> {
    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
    };

    await this.queue.add(jobName, data, { ...defaultOptions, ...options });
  }
}

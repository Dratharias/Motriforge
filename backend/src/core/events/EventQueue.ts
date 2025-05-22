import { Event } from './models/Event';
import { LoggerFacade } from '../logging/LoggerFacade';
import { EventMetrics } from './EventMetrics';
import { EventQueueConfig } from '@/types/events';


/**
 * In-memory queue for handling events asynchronously
 */
export class EventQueue {
  private readonly queue: Event[] = [];
  private readonly deadLetterQueue: Array<{
    event: Event;
    error: Error;
    failedAt: Date;
    attempts: number;
  }> = [];
  private workers: number;
  private readonly processingFn: (event: Event) => Promise<void>;
  private active: boolean = false;
  private readonly metrics: EventMetrics;
  private readonly logger: LoggerFacade;
  private readonly activeProcesses: Promise<void>[] = [];
  private readonly config: EventQueueConfig;

  constructor(
    processingFn: (event: Event) => Promise<void>,
    logger: LoggerFacade,
    metrics: EventMetrics,
    workers: number = 2,
    config: Partial<EventQueueConfig> = {}
  ) {
    this.processingFn = processingFn;
    this.workers = workers;
    this.metrics = metrics;
    this.logger = logger.withComponent('EventQueue');
    
    this.config = {
      maxRetries: 3,
      enableDeadLetterQueue: true,
      maxDeadLetterQueueSize: 1000,
      logDeadLetterEvents: true,
      ...config
    };
  }

  /**
   * Add an event to the queue
   * 
   * @param event Event to enqueue
   */
  public enqueue(event: Event): void {
    this.queue.push(event);
    
    this.metrics.recordEventPublished(event.type);
    
    this.logger.debug(`Enqueued event: ${event.type}`, {
      eventId: event.id,
      eventType: event.type
    });
    
    // Start processing if we're not already active
    if (this.active && this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Start processing the queue
   */
  public start(): void {
    if (this.active) return;
    
    this.active = true;
    this.logger.info('Event queue started', { workers: this.workers });
    
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Stop processing the queue
   */
  public stop(): void {
    this.active = false;
    this.logger.info('Event queue stopped');
  }

  /**
   * Clear all events from the queue
   */
  public clear(): void {
    const count = this.queue.length;
    this.queue.length = 0;
    this.logger.info(`Cleared event queue, removed ${count} events`);
  }

  /**
   * Get the current queue size
   * 
   * @returns Number of events in the queue
   */
  public getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get the current dead letter queue size
   * 
   * @returns Number of events in the dead letter queue
   */
  public getDeadLetterQueueSize(): number {
    return this.deadLetterQueue.length;
  }

  /**
   * Set the number of concurrent workers
   * 
   * @param count Number of workers
   */
  public setWorkers(count: number): void {
    if (count < 1) {
      throw new Error('Worker count must be at least 1');
    }
    
    this.workers = count;
    this.logger.info(`Updated worker count to ${count}`);
    
    // Start additional workers if needed
    if (this.active && this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Process events from the queue
   */
  private async processQueue(): Promise<void> {
    // Cap the number of concurrent processes
    const availableWorkers = Math.max(0, this.workers - this.activeProcesses.length);
    
    if (availableWorkers <= 0 || this.queue.length === 0 || !this.active) {
      return;
    }
    
    for (let i = 0; i < availableWorkers && this.queue.length > 0; i++) {
      const event = this.queue.shift();
      if (!event) break;
      
      const processPromise = this.processEvent(event)
        .finally(() => {
          // Remove this promise from active processes
          const index = this.activeProcesses.indexOf(processPromise);
          if (index !== -1) {
            this.activeProcesses.splice(index, 1);
          }
          
          // Continue processing if more events exist
          if (this.active && this.queue.length > 0) {
            this.processQueue();
          }
        });
      
      this.activeProcesses.push(processPromise);
    }
  }

  /**
   * Process a single event
   * 
   * @param event Event to process
   */
  private async processEvent(event: Event): Promise<void> {
    try {
      const startTime = Date.now();
      
      this.logger.debug(`Processing event: ${event.type}`, {
        eventId: event.id,
        eventType: event.type
      });
      
      await this.processingFn(event);
      
      const duration = Date.now() - startTime;
      
      this.metrics.recordEventProcessed(event.type, duration);
      
      this.logger.debug(`Processed event: ${event.type}`, {
        eventId: event.id,
        eventType: event.type,
        duration
      });
    } catch (error) {
      this.handleProcessingError(event, error as Error);
    }
  }

  /**
   * Handle errors during event processing
   * 
   * @param event The event that caused the error
   * @param error The error that occurred
   */
  private handleProcessingError(event: Event, error: Error): void {
    this.metrics.recordEventError(event.type, error);
    
    this.logger.error(`Error processing event: ${event.type}`, error, {
      eventId: event.id,
      eventType: event.type,
      retry: event.metadata.retry
    });
    
    // Determine if we should retry or send to DLQ
    const maxRetries = this.getMaxRetries(event);
    
    if (event.metadata.retry < maxRetries) {
      this.scheduleRetry(event);
    } else {
      this.sendToDeadLetterQueue(event, error);
    }
  }
  
  /**
   * Get the maximum number of retries for an event
   * 
   * @param event The event to check
   * @returns The maximum number of retries
   */
  private getMaxRetries(event: Event): number {
    // Use event-specific maxRetries if specified, otherwise use default
    return event.metadata.maxRetries ?? this.config.maxRetries;
  }
  
  /**
   * Schedule a retry for a failed event
   * 
   * @param event The event to retry
   */
  private scheduleRetry(event: Event): void {
    const retryEvent = event.forRetry();
    
    // Add a delay before retrying
    const delayMs = Math.pow(2, retryEvent.metadata.retry) * 1000; // Exponential backoff
    
    this.logger.debug(`Scheduled retry for event: ${event.type}`, {
      eventId: event.id,
      retry: retryEvent.metadata.retry,
      maxRetries: retryEvent.metadata.maxRetries,
      delayMs
    });
    
    setTimeout(() => {
      this.enqueue(retryEvent);
    }, delayMs);
  }

  /**
   * Send a failed event to the dead letter queue
   * 
   * @param event The failed event
   * @param error The error that occurred
   */
  private sendToDeadLetterQueue(event: Event, error: Error): void {
    if (!this.config.enableDeadLetterQueue) {
      this.logger.warn(`Max retries exceeded for event: ${event.type}, event discarded`, {
        eventId: event.id,
        retry: event.metadata.retry,
        maxRetries: this.getMaxRetries(event)
      });
      return;
    }
    
    // Add to dead letter queue
    this.deadLetterQueue.push({
      event,
      error,
      failedAt: new Date(),
      attempts: event.metadata.retry + 1
    });
    
    // Enforce max size of dead letter queue
    if (this.deadLetterQueue.length > this.config.maxDeadLetterQueueSize) {
      const removedEvent = this.deadLetterQueue.shift();
      
      this.logger.warn('Dead letter queue overflow, removed oldest event', {
        removedEventId: removedEvent?.event.id,
        removedEventType: removedEvent?.event.type,
        queueSize: this.deadLetterQueue.length
      });
    }
    
    if (this.config.logDeadLetterEvents) {
      this.logger.warn(`Event sent to dead letter queue: ${event.type}`, {
        eventId: event.id,
        eventType: event.type,
        retry: event.metadata.retry,
        maxRetries: this.getMaxRetries(event),
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack
        }
      });
    }
  }
  
  /**
   * Get all events from the dead letter queue
   * 
   * @returns The contents of the dead letter queue
   */
  public getDeadLetterEvents(): Array<{
    event: Event;
    error: Error;
    failedAt: Date;
    attempts: number;
  }> {
    return [...this.deadLetterQueue];
  }
  
  /**
   * Retry processing a specific event from the dead letter queue
   * 
   * @param eventId ID of the event to retry
   * @returns True if the event was found and requeued
   */
  public retryDeadLetterEvent(eventId: string): boolean {
    const index = this.deadLetterQueue.findIndex(item => item.event.id === eventId);
    
    if (index === -1) {
      return false;
    }
    
    const { event } = this.deadLetterQueue[index];
    
    // Remove from dead letter queue
    this.deadLetterQueue.splice(index, 1);
    
    // Reset retry count
    const resetEvent = event.with({
      metadata: {
        ...event.metadata,
        retry: 0
      }
    });
    
    // Add back to main queue
    this.enqueue(resetEvent);
    
    this.logger.info(`Retrying event from dead letter queue: ${event.type}`, {
      eventId: event.id
    });
    
    return true;
  }
  
  /**
   * Retry all events in the dead letter queue
   * 
   * @returns Number of events requeued
   */
  public retryAllDeadLetterEvents(): number {
    const count = this.deadLetterQueue.length;
    
    for (const { event } of [...this.deadLetterQueue]) {
      // Reset retry count
      const resetEvent = event.with({
        metadata: {
          ...event.metadata,
          retry: 0
        }
      });
      
      // Add back to main queue
      this.enqueue(resetEvent);
    }
    
    // Clear the dead letter queue
    this.deadLetterQueue.length = 0;
    
    this.logger.info(`Requeued all events from dead letter queue: ${count} events`);
    
    return count;
  }
  
  /**
   * Purge the dead letter queue
   * 
   * @returns Number of events purged
   */
  public purgeDeadLetterQueue(): number {
    const count = this.deadLetterQueue.length;
    this.deadLetterQueue.length = 0;
    
    this.logger.info(`Purged dead letter queue: ${count} events`);
    
    return count;
  }
}
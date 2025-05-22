import { EventTypeMetrics, SubscriberMetrics, EventSystemMetrics } from "@/types/events";
import { LoggerFacade } from "../logging/LoggerFacade";
import { EventBus } from "./EventBus";


/**
 * Service for collecting and tracking event metrics
 */
export class EventMetrics {
  private readonly eventCounts: Map<string, number> = new Map();
  private readonly processingTimes: Map<string, number[]> = new Map();
  private readonly errorCounts: Map<string, number> = new Map();
  private readonly errorTypes: Map<string, Map<string, number>> = new Map();
  private readonly subscriberTimes: Map<string, Record<string, number[]>> = new Map();
  private readonly maxSamples: number = 100;
  private queueSize: number = 0;
  private readonly recentEvents: { time: number; type: string; isError: boolean }[] = [];
  private readonly logger?: LoggerFacade;

  private readonly eventBus?: EventBus;

  constructor(options?: {
    logger?: LoggerFacade;
    eventBus?: EventBus;
  }) {
    this.logger = options?.logger;
    this.eventBus = options?.eventBus;
  }
  
  /**
   * Records a new event being published
   * 
   * @param eventType Type of event published
   */
  public recordEventPublished(eventType: string): void {
    this.eventCounts.set(eventType, (this.eventCounts.get(eventType) ?? 0) + 1);
    
    this.recentEvents.push({
      time: Date.now(),
      type: eventType,
      isError: false
    });
    
    // Trim recent events older than 1 minute
    this.trimRecentEvents();
    
    // Notify about significant publication milestones if logger is available
    const count = this.eventCounts.get(eventType) ?? 0;
    if (this.logger && this.isSignificantCount(count)) {
      this.logger.info(`Event publication milestone: ${eventType}`, {
        eventType,
        count,
        totalEvents: this.getTotalEventCount()
      });
    }
  }
  
  /**
   * Checks if a count represents a significant milestone (powers of 10, etc.)
   */
  private isSignificantCount(count: number): boolean {
    // Log first event, powers of 10, or every 1000 events
    return count === 1 || 
           count === 10 || 
           count === 100 || 
           count === 1000 || 
           count % 10000 === 0;
  }
  
  /**
   * Gets the total number of events across all types
   */
  private getTotalEventCount(): number {
    let total = 0;
    for (const count of this.eventCounts.values()) {
      total += count;
    }
    return total;
  }

  /**
   * Records an event being processed with its duration
   * 
   * @param eventType Type of event processed
   * @param durationMs Processing duration in milliseconds
   */
  public recordEventProcessed(eventType: string, durationMs: number): void {
    // Store processing time
    const times = this.processingTimes.get(eventType) ?? [];
    times.push(durationMs);
    
    // Keep only the last N samples
    if (times.length > this.maxSamples) {
      times.shift();
    }
    
    this.processingTimes.set(eventType, times);
    
    this.recentEvents.push({
      time: Date.now(),
      type: eventType,
      isError: false
    });
    
    // Trim recent events older than 1 minute
    this.trimRecentEvents();
    
    // Log slow event processing if logger is available
    const isSlowEvent = this.isSlowEvent(eventType, durationMs);
    if (this.logger && isSlowEvent) {
      this.logger.warn(`Slow event processing: ${eventType}`, {
        eventType,
        durationMs,
        averageDuration: this.getAverageDuration(eventType),
        threshold: this.getSlowThreshold(eventType)
      });
      
      // Emit slow processing event if event bus is available
      if (this.eventBus) {
        try {
          this.eventBus.emit('metrics.slow.processing', {
            eventType,
            durationMs,
            timestamp: new Date(),
            averageDuration: this.getAverageDuration(eventType),
            threshold: this.getSlowThreshold(eventType)
          });
        } catch (error) {
          // Don't let event emission errors affect metrics recording
          if (this.logger) {
            this.logger.error('Failed to emit slow processing event', error as Error);
          }
        }
      }
    }
  }
  
  /**
   * Determines if an event processing duration is abnormally slow
   */
  private isSlowEvent(eventType: string, durationMs: number): boolean {
    const threshold = this.getSlowThreshold(eventType);
    return durationMs > threshold;
  }
  
  /**
   * Calculates the threshold for considering an event processing slow
   */
  private getSlowThreshold(eventType: string): number {
    const avgDuration = this.getAverageDuration(eventType);
    // Consider an event slow if it takes more than 3x the average or more than 1000ms
    return Math.max(avgDuration * 3, 1000);
  }
  
  /**
   * Gets the average duration for processing an event type
   */
  private getAverageDuration(eventType: string): number {
    const times = this.processingTimes.get(eventType) ?? [];
    if (times.length === 0) {
      return 0;
    }
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  /**
   * Records an error processing an event
   * 
   * @param eventType Type of event that failed
   * @param error The error that occurred
   */
  public recordEventError(eventType: string, error: Error): void {
    // Increment error count for this event type
    this.errorCounts.set(eventType, (this.errorCounts.get(eventType) ?? 0) + 1);
    
    // Track error type distribution
    this.recordErrorType(eventType, error);
    
    // Add to recent events for time-windowed metrics
    this.recentEvents.push({
      time: Date.now(),
      type: eventType,
      isError: true
    });
    
    // Trim recent events older than 1 minute
    this.trimRecentEvents();
    
    // Log the error if logger is available
    if (this.logger) {
      this.logger.warn(`Event processing error for type: ${eventType}`, {
        eventType,
        errorName: error.name,
        errorMessage: error.message,
        errorCount: this.errorCounts.get(eventType)
      });
    }
    
    // Publish error metrics event if event bus is available
    if (this.eventBus) {
      try {
        this.eventBus.emit('metrics.error.recorded', {
          eventType,
          errorType: error.name,
          timestamp: new Date(),
          count: this.errorCounts.get(eventType),
          errorDetails: {
            name: error.name,
            message: error.message
          }
        });
      } catch (emitError) {
        // Don't let event emission errors affect metrics recording
        if (this.logger) {
          this.logger.error('Failed to emit metrics error event', emitError as Error);
        }
      }
    }
  }
  
  /**
   * Records the type of error that occurred
   * 
   * @param eventType The event type that had an error
   * @param error The error that occurred
   */
  private recordErrorType(eventType: string, error: Error): void {
    if (!this.errorTypes.has(eventType)) {
      this.errorTypes.set(eventType, new Map<string, number>());
    }
    
    const errorTypeMap = this.errorTypes.get(eventType)!;
    const errorTypeName = error.name || 'UnknownError';
    
    errorTypeMap.set(errorTypeName, (errorTypeMap.get(errorTypeName) ?? 0) + 1);
  }

  /**
   * Records execution time for a specific handler and event type
   * 
   * @param subscriberId ID of the subscriber
   * @param eventType Type of event being handled
   * @param durationMs Processing duration in milliseconds
   */
  public recordHandlerExecution(subscriberId: string, eventType: string, durationMs: number): void {
    let subscriber = this.subscriberTimes.get(subscriberId);
    
    if (!subscriber) {
      subscriber = {};
      this.subscriberTimes.set(subscriberId, subscriber);
    }
    
    if (!subscriber[eventType]) {
      subscriber[eventType] = [];
    }
    
    subscriber[eventType].push(durationMs);
    
    // Keep only the last N samples
    if (subscriber[eventType].length > this.maxSamples) {
      subscriber[eventType].shift();
    }
  }

  /**
   * Update the current queue size
   * 
   * @param size Current size of the event queue
   */
  public updateQueueSize(size: number): void {
    this.queueSize = size;
  }

  /**
   * Get metrics for a specific event type
   * 
   * @param eventType The event type to get metrics for
   * @returns Metrics for the specified event type
   */
  public getEventTypeMetrics(eventType: string): EventTypeMetrics {
    const published = this.eventCounts.get(eventType) ?? 0;
    const errors = this.errorCounts.get(eventType) ?? 0;
    const processingTimes = this.processingTimes.get(eventType) ?? [];
    const errorTypeMap = this.errorTypes.get(eventType) ?? new Map<string, number>();
    
    const processed = processingTimes.length;
    
    let avgProcessingTime = 0;
    let maxProcessingTime = 0;
    
    if (processingTimes.length > 0) {
      avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      maxProcessingTime = Math.max(...processingTimes);
    }
    
    // Convert error type map to object
    const errorTypeDistribution: Record<string, number> = {};
    for (const [errorType, count] of errorTypeMap.entries()) {
      errorTypeDistribution[errorType] = count;
    }
    
    return {
      published,
      processed,
      errors,
      avgProcessingTime,
      maxProcessingTime,
      processingTimeHistory: [...processingTimes],
      errorTypeDistribution
    };
  }

  /**
   * Get metrics for a specific subscriber
   * 
   * @param subscriberId ID of the subscriber
   * @returns Metrics for the specified subscriber
   */
  public getSubscriberMetrics(subscriberId: string): SubscriberMetrics {
    const subscriberData = this.subscriberTimes.get(subscriberId) || {};
    
    const eventTypes: Record<string, number> = {};
    let totalProcessed = 0;
    let totalTime = 0;
    
    for (const [eventType, times] of Object.entries(subscriberData)) {
      eventTypes[eventType] = times.length;
      totalProcessed += times.length;
      totalTime += times.reduce((sum, time) => sum + time, 0);
    }
    
    return {
      processed: totalProcessed,
      errors: 0, // We don't track errors by subscriber currently
      avgProcessingTime: totalProcessed > 0 ? totalTime / totalProcessed : 0,
      eventTypes
    };
  }

  /**
   * Get overall metrics for the event system
   * 
   * @returns Comprehensive metrics for the event system
   */
  public getAllMetrics(): EventSystemMetrics {
    // Calculate totals
    let totalPublished = 0;
    let totalProcessed = 0;
    let totalErrors = 0;
    
    for (const count of this.eventCounts.values()) {
      totalPublished += count;
    }
    
    for (const times of this.processingTimes.values()) {
      totalProcessed += times.length;
    }
    
    for (const count of this.errorCounts.values()) {
      totalErrors += count;
    }
    
    // Calculate events in the last minute
    const oneMinuteAgo = Date.now() - 60000;
    const recentEventsFiltered = this.recentEvents.filter(e => e.time >= oneMinuteAgo);
    
    const publishedLastMinute = recentEventsFiltered.filter(e => !e.isError).length;
    const processedLastMinute = recentEventsFiltered.length;
    const errorsLastMinute = recentEventsFiltered.filter(e => e.isError).length;
    
    // Collect per-type metrics
    const byEventType: Record<string, EventTypeMetrics> = {};
    
    for (const eventType of this.eventCounts.keys()) {
      byEventType[eventType] = this.getEventTypeMetrics(eventType);
    }
    
    // Collect per-subscriber metrics
    const bySubscriber: Record<string, SubscriberMetrics> = {};
    
    for (const subscriberId of this.subscriberTimes.keys()) {
      bySubscriber[subscriberId] = this.getSubscriberMetrics(subscriberId);
    }
    
    // Calculate error rates
    const errorRate = totalPublished > 0 ? (totalErrors / totalPublished) * 100 : 0;
    const errorRateLastMinute = publishedLastMinute > 0 
      ? (errorsLastMinute / publishedLastMinute) * 100 
      : 0;
    
    return {
      totalPublished,
      totalProcessed,
      totalErrors,
      publishedLastMinute,
      processedLastMinute,
      queueSize: this.queueSize,
      errorRate,
      errorRateLastMinute,
      byEventType,
      bySubscriber,
      eventTypeCount: this.eventCounts.size,
      mostPublishedEventType: this.getMostPublishedEventType(),
      mostErroredEventType: this.getMostErroredEventType(),
      averageProcessingTime: this.getOverallAverageProcessingTime()
    };
  }
  
  /**
   * Gets the event type with the most publications
   */
  private getMostPublishedEventType(): string | null {
    let maxCount = 0;
    let maxType: string | null = null;
    
    for (const [type, count] of this.eventCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    }
    
    return maxType;
  }
  
  /**
   * Gets the event type with the most errors
   */
  private getMostErroredEventType(): string | null {
    let maxCount = 0;
    let maxType: string | null = null;
    
    for (const [type, count] of this.errorCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    }
    
    return maxType;
  }
  
  /**
   * Gets the overall average processing time across all event types
   */
  private getOverallAverageProcessingTime(): number {
    let totalTime = 0;
    let totalCount = 0;
    
    for (const times of this.processingTimes.values()) {
      totalCount += times.length;
      totalTime += times.reduce((sum, time) => sum + time, 0);
    }
    
    return totalCount > 0 ? totalTime / totalCount : 0;
  }

  /**
   * Reset all metrics
   */
  public resetMetrics(): void {
    this.eventCounts.clear();
    this.processingTimes.clear();
    this.errorCounts.clear();
    this.subscriberTimes.clear();
    this.errorTypes.clear();
    this.recentEvents.length = 0;
    this.queueSize = 0;
    
    if (this.logger) {
      this.logger.info('All event metrics have been reset');
    }
    
    // Notify about metrics reset if event bus is available
    if (this.eventBus) {
      try {
        this.eventBus.emit('metrics.reset', {
          timestamp: new Date()
        });
      } catch (error) {
        // Don't let event emission errors affect metrics reset
        if (this.logger) {
          this.logger.error('Failed to emit metrics reset event', error as Error);
        }
      }
    }
  }

  /**
   * Remove events older than 1 minute from the recent events list
   */
  private trimRecentEvents(): void {
    const oneMinuteAgo = Date.now() - 60000;
    let i = 0;
    
    while (i < this.recentEvents.length && this.recentEvents[i].time < oneMinuteAgo) {
      i++;
    }
    
    if (i > 0) {
      this.recentEvents.splice(0, i);
    }
  }
}

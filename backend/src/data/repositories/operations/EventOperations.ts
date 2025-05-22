import { EventMediator } from '@/core/events/EventMediator';
import { LoggerFacade } from '@/core/logging';
import { RepositoryContext } from '@/types/repositories/base';

/**
 * Handles event publishing for repository operations
 */
export class EventOperations {
  constructor(
    private readonly eventMediator: EventMediator,
    private readonly logger: LoggerFacade,
    private readonly componentName: string
  ) {}

  /**
   * Publish domain event
   */
  public async publishEvent(
    eventType: string, 
    payload: any, 
    context?: RepositoryContext
  ): Promise<void> {
    try {
      await this.eventMediator.publishAsync({
        type: eventType,
        payload,
        source: this.componentName,
        correlationId: context?.requestId,
        timestamp: new Date()
      } as any);
    } catch (error) {
      this.logger.warn('Failed to publish event', { 
        eventType, 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Publish create event
   */
  public async publishCreateEvent(
    collectionName: string,
    doc: any,
    context?: RepositoryContext
  ): Promise<void> {
    if (context?.skipEvents) return;
    
    await this.publishEvent(`${collectionName}.created`, {
      id: this.extractId(doc),
      data: doc,
      createdBy: context?.userId,
      timestamp: new Date()
    }, context);
  }

  /**
   * Publish create many event
   */
  public async publishCreateManyEvent(
    collectionName: string,
    docs: any[],
    context?: RepositoryContext
  ): Promise<void> {
    if (context?.skipEvents) return;
    
    await this.publishEvent(`${collectionName}.created_many`, {
      count: docs.length,
      ids: docs.map(doc => this.extractId(doc)),
      createdBy: context?.userId,
      timestamp: new Date()
    }, context);
  }

  /**
   * Publish update event
   */
  public async publishUpdateEvent(
    collectionName: string,
    doc: any,
    context?: RepositoryContext
  ): Promise<void> {
    if (context?.skipEvents) return;
    
    await this.publishEvent(`${collectionName}.updated`, {
      id: this.extractId(doc),
      data: doc,
      updatedBy: context?.userId,
      timestamp: new Date()
    }, context);
  }

  /**
   * Publish update many event
   */
  public async publishUpdateManyEvent(
    collectionName: string,
    query: any,
    modifiedCount: number,
    context?: RepositoryContext
  ): Promise<void> {
    if (context?.skipEvents) return;
    
    await this.publishEvent(`${collectionName}.updated_many`, {
      query,
      modifiedCount,
      updatedBy: context?.userId,
      timestamp: new Date()
    }, context);
  }

  /**
   * Publish delete event
   */
  public async publishDeleteEvent(
    collectionName: string,
    id: string,
    context?: RepositoryContext
  ): Promise<void> {
    if (context?.skipEvents) return;
    
    await this.publishEvent(`${collectionName}.deleted`, {
      id,
      deletedBy: context?.userId,
      timestamp: new Date()
    }, context);
  }

  /**
   * Publish delete many event
   */
  public async publishDeleteManyEvent(
    collectionName: string,
    query: any,
    deletedCount: number,
    context?: RepositoryContext
  ): Promise<void> {
    if (context?.skipEvents) return;
    
    await this.publishEvent(`${collectionName}.deleted_many`, {
      query,
      deletedCount,
      deletedBy: context?.userId,
      timestamp: new Date()
    }, context);
  }

  /**
   * Publish custom domain event
   */
  public async publishCustomEvent(
    eventType: string,
    payload: any,
    context?: RepositoryContext
  ): Promise<void> {
    if (context?.skipEvents) return;
    
    await this.publishEvent(eventType, {
      ...payload,
      timestamp: new Date()
    }, context);
  }

  /**
   * Extract ID from document
   */
  private extractId(doc: any): string {
    if (doc && typeof doc === 'object') {
      if (doc._id) {
        return doc._id.toString();
      }
      if (doc.id) {
        return doc.id.toString();
      }
    }
    return 'unknown';
  }
}
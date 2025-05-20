```mermaid
classDiagram
    %% Comprehensive Event System Architecture
    
    class EventFacade {
        <<Facade>>
        -eventMediator: EventMediator
        -eventRegistry: EventRegistry
        -eventPublisher: EventPublisher
        -contextProvider: EventContextProvider
        +publish(eventType: string, payload: any): void
        +publishAsync(eventType: string, payload: any): Promise~void~
        +createEvent(type: string, payload: any): Event
        +createTypedEvent~T extends Event~(payload: any): T
        +subscribe(eventTypes: string[], handler: EventHandler): Subscription
        +subscribeOnce(eventType: string, handler: EventHandler): Subscription
        +subscribeToAll(handler: EventHandler): Subscription
        +getEventTypes(): string[]
    }
    
    class EventMediator {
        <<Mediator>>
        -subscribers: Map~EventType, Set~EventSubscriber~~
        -eventQueue: EventQueue
        -eventPublisher: EventPublisher
        -logger: LoggerFacade
        -metrics: EventMetrics
        +initialize(): Promise~void~
        +subscribe(eventTypes: EventType[], subscriber: EventSubscriber): Subscription
        +publish(event: Event): void
        +publishAsync(event: Event): Promise~void~
        +unsubscribe(subscription: Subscription): void
        +getSubscribers(eventType: EventType): EventSubscriber[]
        -notifySubscribers(event: Event): void
        -processEvent(event: Event): Promise~void~
        -prioritizeHandlers(handlers: EventSubscriber[]): EventSubscriber[]
    }
    
    class EventPublisher {
        <<Service>>
        -mediator: EventMediator
        -config: EventPublisherConfig
        -metrics: EventMetrics
        -contextProvider: EventContextProvider
        -eventEnricher: EventEnricher
        -distributedPublisher?: DistributedEventPublisher
        +publishEvent(event: Event): void
        +publishEventAsync(event: Event): Promise~void~
        +createEvent(type: EventType, payload: any): Event
        +createTypedEvent~T extends Event~(payload: any): T
        -enrichEvent(event: Event): Event
        -logEvent(event: Event): void
        -recordMetrics(event: Event): void
        -shouldPublishToDistributed(event: Event): boolean
    }
    
    class EventSubscriber {
        <<Interface>>
        +handleEvent(event: Event): void | Promise~void~
        +getSubscriptionTypes(): EventType[]
        +getPriority(): number
        +getId(): string
    }
    
    class EventQueue {
        <<Infrastructure>>
        -queue: Queue~Event~
        -workers: number
        -processingFn: (event: Event) => Promise~void~
        -active: boolean
        -metrics: EventMetrics
        -logger: LoggerFacade
        +enqueue(event: Event): void
        +start(): void
        +stop(): void
        +clear(): void
        +getQueueSize(): number
        +setWorkers(count: number): void
        -processQueue(): Promise~void~
        -processEvent(event: Event): Promise~void~
        -handleProcessingError(event: Event, error: Error): void
    }
    
    class EventRegistry {
        <<Registry>>
        -eventTypes: Map~string, EventTypeDefinition~
        -eventSchemas: Map~string, EventSchema~
        -eventGroups: Map~string, Set~string~~
        +registerEventType(name: string, definition: EventTypeDefinition): void
        +registerEventGroup(groupName: string, eventTypes: string[]): void
        +getEventType(name: string): EventTypeDefinition | null
        +getEventSchema(name: string): EventSchema | null
        +validateEvent(event: Event): ValidationResult
        +getEventsByGroup(groupName: string): string[]
        +getAllEventTypes(): EventTypeDefinition[]
        -validateEventTypeDefinition(definition: EventTypeDefinition): boolean
    }
    
    class EventContextProvider {
        <<Service>>
        -requestContext: AsyncLocalStorage~RequestContext~
        -userProvider: UserProvider
        -config: EventContextConfig
        +getContext(): EventContext
        +setContext(context: EventContext): void
        +withContext~T~(context: EventContext, fn: () => T): T
        +enrichEventWithContext(event: Event): Event
        +getRequestContext(): RequestContext | null
        +getUserContext(): UserContext | null
        +extractContextFromRequest(request: Request): EventContext
    }
    
    class Event {
        <<Entity>>
        +id: string
        +type: EventType
        +timestamp: Date
        +payload: any
        +metadata: EventMetadata
        +source: string
        +correlationId?: string
        +context?: EventContext
        +version: string
        +isAcknowledged: boolean
        +acknowledge(): void
        +getTypedPayload~T~(): T
        +hasPayloadProperty(key: string): boolean
    }
    
    class EventSchema {
        <<Definition>>
        +properties: Record~string, PropertyDefinition~
        +required: string[]
        +description?: string
        +validate(payload: any): ValidationResult
        +getPropertyDefinition(name: string): PropertyDefinition | null
        +hasProperty(name: string): boolean
    }
    
    class DistributedEventPublisher {
        <<Interface>>
        +publishToChannel(channel: string, event: Event): Promise~void~
        +subscribe(channel: string, handler: (event: Event) => Promise~void~): Subscription
        +unsubscribe(subscription: Subscription): Promise~void~
        +getAvailableChannels(): string[]
    }
    
    class RedisEventPublisher {
        <<Service>>
        -client: RedisClient
        -eventPrefix: string
        -encoder: EventEncoder
        -decoder: EventDecoder
        -subscriptions: Map~string, ChannelSubscription~
        +publishToChannel(channel: string, event: Event): Promise~void~
        +subscribe(channel: string, handler: (event: Event) => Promise~void~): Subscription
        +unsubscribe(subscription: Subscription): Promise~void~
        +getAvailableChannels(): string[]
        -handleIncomingMessage(channel: string, message: string): Promise~void~
        -encodeEvent(event: Event): string
        -decodeEvent(data: string): Event
    }
    
    class KafkaEventPublisher {
        <<Service>>
        -producer: KafkaProducer
        -consumer: KafkaConsumer
        -topicPrefix: string
        -encoder: EventEncoder
        -decoder: EventDecoder
        -subscriptions: Map~string, TopicSubscription~
        +publishToChannel(channel: string, event: Event): Promise~void~
        +subscribe(channel: string, handler: (event: Event) => Promise~void~): Subscription
        +unsubscribe(subscription: Subscription): Promise~void~
        +getAvailableChannels(): string[]
        -handleIncomingMessage(topic: string, message: KafkaMessage): Promise~void~
        -encodeEvent(event: Event): Buffer
        -decodeEvent(data: Buffer): Event
    }
    
    class EventTypeDefinition {
        <<Definition>>
        +name: string
        +description: string
        +schema: EventSchema
        +metadata: Record~string, any~
        +version: string
        +deprecated?: boolean
        +groups: string[]
        +persistencePolicy?: PersistencePolicy
    }
    
    class EventEnricher {
        <<Service>>
        -enrichers: Map~string, (event: Event) => Event~
        -globalEnrichers: ((event: Event) => Event)[]
        -logger: LoggerFacade
        +addEnricher(eventType: string, enricher: (event: Event) => Event): void
        +addGlobalEnricher(enricher: (event: Event) => Event): void
        +enrichEvent(event: Event): Event
        +removeEnricher(eventType: string): boolean
        +clearAllEnrichers(): void
    }
    
    class EventBus {
        <<Service>>
        -mediator: EventMediator
        -eventTypes: string[]
        -subscribers: Map~string, Set~(event: Event) => void~~
        +on(eventType: string, callback: (event: Event) => void): void
        +off(eventType: string, callback: (event: Event) => void): void
        +once(eventType: string, callback: (event: Event) => void): void
        +emit(eventType: string, data: any): void
        +emitAsync(eventType: string, data: any): Promise~void~
        +subscribe(options: SubscriptionOptions): Subscription
    }
    
    class EventHandler {
        <<Interface>>
        +handleEvent(event: Event): Promise~void~ | void
    }
    
    class AuthEventHandler {
        <<Handler>>
        -authService: AuthService
        -tokenService: TokenService
        -cacheService: CacheService
        -logger: LoggerFacade
        +handleEvent(event: Event): Promise~void~
        -handleLoginEvent(event: Event): Promise~void~
        -handleLogoutEvent(event: Event): Promise~void~
        -handlePasswordChangeEvent(event: Event): Promise~void~
        -invalidateTokens(userId: string): Promise~void~
    }
    
    class CacheInvalidationHandler {
        <<Handler>>
        -cacheManager: CacheManager
        -logger: LoggerFacade
        +handleEvent(event: Event): Promise~void~
        -invalidateUserCache(userId: string): Promise~void~
        -invalidateEntityCache(entityType: string, entityId: string): Promise~void~
        -determineInvalidationStrategy(event: Event): InvalidationStrategy
    }
    
    class AuditEventHandler {
        <<Handler>>
        -auditLogger: AuditLogger
        -userService: UserService
        -logger: LoggerFacade
        +handleEvent(event: Event): Promise~void~
        -createAuditRecord(event: Event): AuditRecord
        -enrichAuditData(event: Event): Promise~EnrichedAuditData~
        -shouldAudit(event: Event): boolean
    }
    
    class NotificationEventHandler {
        <<Handler>>
        -notificationService: NotificationService
        -userService: UserService
        -logger: LoggerFacade
        +handleEvent(event: Event): Promise~void~
        -createNotification(event: Event): NotificationData
        -determineRecipients(event: Event): Promise~string[]~
        -shouldSendNotification(event: Event, userId: string): Promise~boolean~
    }
    
    class EventMetrics {
        <<Service>>
        -metricCollector: MetricCollector
        -eventCounts: Map~string, number~
        -handlerTimings: Map~string, number[]~
        -errorCounts: Map~string, number~
        +recordEventPublished(eventType: string): void
        +recordEventProcessed(eventType: string, durationMs: number): void
        +recordEventError(eventType: string, error: Error): void
        +recordHandlerExecution(subscriberId: string, eventType: string, durationMs: number): void
        +getEventTypeMetrics(eventType: string): EventTypeMetrics
        +getSubscriberMetrics(subscriberId: string): SubscriberMetrics
        +getAllMetrics(): EventSystemMetrics
        +resetMetrics(): void
    }
    
    class EventContext {
        <<ValueObject>>
        +userId?: string
        +organizationId?: string
        +requestId?: string
        +sessionId?: string
        +ipAddress?: string
        +userAgent?: string
        +locale?: string
        +traceId?: string
        +custom?: Record~string, any~
    }
    
    class EventMetadata {
        <<ValueObject>>
        +priority: EventPriority
        +origin: string
        +version: string
        +retry: number
        +maxRetries: number
        +delayMs?: number
        +routingKey?: string
        +ttl?: number
    }
    
    class Subscription {
        <<ValueObject>>
        +id: string
        +subscriberId: string
        +eventTypes: string[]
        +createdAt: Date
        +options?: SubscriptionOptions
        +cancel(): void
        +isActive(): boolean
        +matches(eventType: string): boolean
    }
    
    class EventPriority {
        <<Enumeration>>
        HIGH: "high"
        NORMAL: "normal"
        LOW: "low"
        BULK: "bulk"
    }
    
    %% Specific Event Types
    class DomainEvent~T~ {
        <<Abstract>>
        +entityType: string
        +entityId: string
        +action: string
        +data: T
        +userId: string
        +getEntityReference(): EntityReference
    }
    
    class UserEvent {
        <<Domain>>
        +userId: string
        +action: string
        +data: any
    }
    
    class AuthEvent {
        <<Domain>>
        +userId: string
        +action: AuthAction
        +device?: DeviceInfo
        +metadata?: AuthMetadata
    }
    
    class SystemEvent {
        <<System>>
        +component: string
        +action: string
        +severity: SeverityLevel
        +details: any
    }
    
    %% Relationships
    EventFacade --> EventMediator : uses
    EventFacade --> EventRegistry : uses
    EventFacade --> EventPublisher : uses
    EventFacade --> EventContextProvider : uses
    
    EventMediator --> EventSubscriber : notifies
    EventMediator --> EventQueue : uses for async processing
    EventMediator --> EventPublisher : delegates publishing to
    
    EventPublisher --> EventEnricher : uses to enrich events
    EventPublisher --> DistributedEventPublisher : may use for distribution
    
    RedisEventPublisher --|> DistributedEventPublisher : implements
    KafkaEventPublisher --|> DistributedEventPublisher : implements
    
    EventRegistry --> EventTypeDefinition : manages
    EventRegistry --> EventSchema : manages
    
    AuthEventHandler --|> EventHandler : implements
    CacheInvalidationHandler --|> EventHandler : implements
    AuditEventHandler --|> EventHandler : implements
    NotificationEventHandler --|> EventHandler : implements
    
    EventQueue --> Event : processes
    
    EventBus --> EventMediator : uses
    
    DomainEvent~T~ --|> Event : extends
    UserEvent --|> DomainEvent : extends
    AuthEvent --|> DomainEvent : extends
    SystemEvent --|> Event : extends
    
    Event "1" --> "1" EventType : categorized by
    Event "1" --> "1" EventMetadata : contains
    Event "0..1" --> "0..1" EventContext : provides context via```

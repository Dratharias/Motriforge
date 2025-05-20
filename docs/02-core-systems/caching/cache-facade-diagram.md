```mermaid
classDiagram
    %% Cache Facade and Related Components
    
    class CacheFacade {
        -cacheManager: CacheManager
        -cacheMediator: CacheEventMediator
        -cacheConfig: CacheConfig
        +get~T~(key: string, domain?: string): Promise~T~
        +set~T~(key: string, value: T, options?: CacheOptions, domain?: string): Promise~void~
        +remove(key: string, domain?: string): Promise~void~
        +clear(domain?: string): Promise~void~
        +has(key: string, domain?: string): Promise~boolean~
        +getAuthCache(): AuthCacheFacade
        +getUserCache(): UserCacheFacade
        +getPermissionCache(): PermissionCacheFacade
        +getApiCache(): ApiCacheFacade
        +getOrganizationCache(): OrganizationCacheFacade
    }
    
    class CacheManager {
        -adapters: Map~string, CacheAdapter~
        -domainMappings: Map~string, string~
        -cacheMediator: CacheEventMediator
        -cacheConfig: CacheConfigProvider
        -healthMonitor: CacheHealthMonitor
        +getAdapter(domain: string): CacheAdapter
        +registerAdapter(name: string, adapter: CacheAdapter): void
        +setDomainAdapter(domain: string, adapterName: string): void
        +get~T~(key: string, domain: string): Promise~T~
        +set~T~(key: string, value: T, options: CacheOptions, domain: string): Promise~void~
        +delete(key: string, domain: string): Promise~void~
        +clear(domain?: string): Promise~void~
        +buildKey(domain: string, key: string): string
        +getHealth(): CacheHealthStatus
        +applyPolicy(domain: string, policy: CachePolicy): void
    }
    
    class CacheEventMediator {
        -subscribers: Map~CacheEventType, Set~CacheEventSubscriber~~
        -eventQueue: CacheEventQueue
        -cacheConfigProvider: CacheConfigProvider
        +subscribe(eventTypes: CacheEventType[], subscriber: CacheEventSubscriber): Subscription
        +publish(event: CacheEvent): void
        +publishAsync(event: CacheEvent): Promise~void~
        +unsubscribe(subscription: Subscription): void
        +subscribeToAuthEvents(authMediator: AuthEventMediator): void
        +subscribeToUserEvents(userMediator: UserEventMediator): void
        -notifySubscribers(event: CacheEvent): void
        -processEvent(event: CacheEvent): Promise~void~
    }
    
    class CacheAdapter {
        <<interface>>
        +get~T~(key: string): Promise~T~
        +set~T~(key: string, value: T, options?: CacheOptions): Promise~void~
        +delete(key: string): Promise~void~
        +clear(): Promise~void~
        +has(key: string): Promise~boolean~
        +keys(pattern?: string): Promise~string[]~
        +getStatistics(): CacheStats
    }
    
    class MemoryCacheAdapter {
        -store: Map~string, CacheEntry~
        -options: MemoryCacheOptions
        -eventEmitter: EventEmitter
        +get~T~(key: string): Promise~T~
        +set~T~(key: string, value: T, options?: CacheOptions): Promise~void~
        +delete(key: string): Promise~void~
        +clear(): Promise~void~
        +has(key: string): Promise~boolean~
        +keys(pattern?: string): Promise~string[]~
        +getStatistics(): CacheStats
    }
    
    class LocalStorageCacheAdapter {
        -prefix: string
        -memoryMirror: Map~string, any~
        -options: StorageCacheOptions
        +get~T~(key: string): Promise~T~
        +set~T~(key: string, value: T, options?: CacheOptions): Promise~void~
        +delete(key: string): Promise~void~
        +clear(): Promise~void~
        +has(key: string): Promise~boolean~
        +keys(pattern?: string): Promise~string[]~
        +getStatistics(): CacheStats
    }
    
    class CacheInvalidationHandler {
        -cacheManager: CacheManager
        -eventMediator: CacheEventMediator
        -invalidationPatterns: Map~string, InvalidationPattern[]~
        +initialize(): void
        +onEvent(event: CacheEvent): void
        +onAuthEvent(event: AuthEvent): void
        +registerInvalidationPattern(domain: string, pattern: InvalidationPattern): void
        -invalidateCaches(event: CacheEvent): void
        -invalidateByPattern(pattern: InvalidationPattern, metadata: any): void
    }
    
    class InvalidationPattern {
        +domain: string
        +keyPattern: string
        +dependsOn: string[]
        +condition: (metadata: any) => boolean
        +priority: number
        +ttl: number
        +cascading: boolean
    }
    
    class CacheEndpoints {
        <<enumeration>>
        CLEAR: "/api/cache/clear"
        HEALTH: "/api/cache/health"
        STATS: "/api/cache/stats"
    }
    
    %% Relationships
    CacheFacade --> CacheManager : uses
    CacheFacade --> CacheEventMediator : uses
    
    CacheManager --> CacheAdapter : uses
    CacheManager --> CacheEventMediator : publishes to
    
    MemoryCacheAdapter --|> CacheAdapter : implements
    LocalStorageCacheAdapter --|> CacheAdapter : implements
    
    CacheEventMediator --> CacheInvalidationHandler : notifies
    CacheInvalidationHandler --> InvalidationPattern : uses```

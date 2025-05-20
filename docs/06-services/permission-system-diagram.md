```mermaid
classDiagram
    %% Improved Permission System
    
    class PermissionManager {
        <<Singleton>>
        -static instance: PermissionManager
        -strategyRegistry: PermissionStrategyRegistry
        -ruleEngine: PermissionRuleEngine
        -cache: PermissionCache
        +static getInstance(): PermissionManager
        +initialize(): void
        +checkPermission(context, permission): PermissionResult
        +getUserPermissions(userRole): PermissionSet
        +getOrgPermissions(orgRole): PermissionSet
        +registerPermissionStrategy(strategy): void
        +addRule(rule): void
    }
    
    class PermissionStrategyRegistry {
        -strategies: Map
        +register(strategy): void
        +getStrategy(strategyId): PermissionStrategy
        +resolveStrategy(context, permission): PermissionStrategy
    }
    
    class PermissionStrategy {
        <<Interface>>
        +id: string
        +priority: number
        +canHandle(context, permission): boolean
        +check(context, permission): PermissionResult
    }
    
    class ResourcePermissionStrategy {
        +id: string
        +priority: number
        +resourceType: string
        +canHandle(context, permission): boolean
        +check(context, permission): PermissionResult
        #checkResourcePermission(context, action, scope): boolean
    }
    
    class RoleBasedPermissionStrategy {
        +id: string
        +priority: number
        +canHandle(context, permission): boolean
        +check(context, permission): PermissionResult
        -isPermissionInRoleSet(role, permission): boolean
    }
    
    class OwnershipPermissionStrategy {
        +id: string
        +priority: number
        +canHandle(context, permission): boolean
        +check(context, permission): PermissionResult
        -isResourceOwner(context): boolean
    }
    
    class PermissionRuleEngine {
        -rules: Array
        +addRule(rule): void
        +evaluateRules(context, permission): PermissionResult
        -sortRulesByPriority(): void
    }
    
    class PermissionRule {
        +id: string
        +priority: number
        +condition: object
        +permission: string
        +description: string
        +matches(permission): boolean
        +evaluate(context): boolean
    }
    
    class PermissionCache {
        -cache: Map
        +get(cacheKey): PermissionResult
        +set(cacheKey, result): void
        +invalidate(pattern): void
        +generateCacheKey(context, permission): string
    }
    
    class PermissionContext {
        +user: object
        +organization: object
        +resource: object
        +metadata: object
        +getCacheKey(): string
    }
    
    class PermissionResult {
        +allowed: boolean
        +reason: string
        +strategy: string
        +rule: string
    }
    
    class PermissionSet {
        +permissions: Set
        +byResource: Map
        +byAction: Map
        +byScope: Map
        +has(permission): boolean
        +getByResource(resourceType): Array
        +getByAction(action): Array
    }
    
    %% Concrete implementations
    class ExercisePermissionStrategy {
        +id: string
        +priority: number
        +resourceType: string
        +canHandle(context, permission): boolean
        +check(context, permission): PermissionResult
    }
    
    class WorkoutPermissionStrategy {
        +id: string
        +priority: number
        +resourceType: string
        +canHandle(context, permission): boolean
        +check(context, permission): PermissionResult
    }
    
    %% Relationships
    PermissionManager --> PermissionStrategyRegistry : uses
    PermissionManager --> PermissionRuleEngine : uses
    PermissionManager --> PermissionCache : uses
    
    PermissionStrategyRegistry o-- PermissionStrategy : contains
    
    ResourcePermissionStrategy ..|> PermissionStrategy : implements
    RoleBasedPermissionStrategy ..|> PermissionStrategy : implements
    OwnershipPermissionStrategy ..|> PermissionStrategy : implements
    
    ExercisePermissionStrategy --|> ResourcePermissionStrategy : extends
    WorkoutPermissionStrategy --|> ResourcePermissionStrategy : extends
    
    PermissionRuleEngine *-- PermissionRule : contains
    
    PermissionManager ..> PermissionContext : uses
    PermissionManager ..> PermissionResult : returns
    PermissionManager ..> PermissionSet : manages```

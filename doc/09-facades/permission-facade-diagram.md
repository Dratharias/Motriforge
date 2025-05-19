```mermaid
classDiagram
    %% Permission Facade and Related Components
    
    class PermissionFacade {
        -permissionService: PermissionService
        -roleService: RoleService
        -resourcePermissions: ResourcePermissions
        -cacheFacade: CacheFacade
        -eventMediator: EventMediator
        +hasPermission(permission: string): Promise~boolean~
        +hasResourcePermission(resourceType: string, resourceId: string, action: string): Promise~boolean~
        +getUserPermissions(): Promise~string[]~
        +getUserRoles(): Promise~string[]~
        +getResourcePermissions(resourceType: string, resourceId: string): Promise~ResourcePermissionSet~
        +canPerformAction(action: string, resource: any): Promise~boolean~
        +getAccessibleResources(resourceType: string): Promise~FilterQuery~
        +checkAccess(requirement: AccessRequirement): Promise~boolean~
    }
    
    class PermissionService {
        -permissionRepository: PermissionRepository
        -roleService: RoleService
        -userService: UserService
        -permissionCache: PermissionCache
        -eventMediator: EventMediator
        -ruleEngine: PermissionRuleEngine
        +hasPermission(userId: string, permission: string): Promise~boolean~
        +getUserPermissions(userId: string): Promise~string[]~
        +evaluatePermissionRules(context: PermissionContext): Promise~RuleResult[]~
        +getPermissionsByRole(role: string): Promise~string[]~
        +addPermission(role: string, permission: string): Promise~void~
        +removePermission(role: string, permission: string): Promise~void~
        +getPermissionFilter(userId: string, resourceType: string): Promise~FilterQuery~
        -getCachedPermissions(userId: string): Promise~string[]~
        -invalidatePermissionCache(userId: string): void
    }
    
    class RoleService {
        -roleRepository: PermissionRepository
        -userRepository: UserRepository
        -eventMediator: EventMediator
        -roleCache: RoleCache
        +getUserRoles(userId: string): Promise~string[]~
        +getRole(roleId: string): Promise~Role~
        +getRolesByIds(roleIds: string[]): Promise~Role[]~
        +assignRole(userId: string, roleId: string): Promise~void~
        +removeRole(userId: string, roleId: string): Promise~void~
        +createRole(role: RoleCreationData): Promise~Role~
        +updateRole(roleId: string, updates: RoleUpdateData): Promise~Role~
        +deleteRole(roleId: string): Promise~void~
        +getRoleHierarchy(roleId: string): Promise~RoleHierarchy~
        -inheritPermissions(childRoleId: string, parentRoleId: string): Promise~void~
        -getCachedRole(roleId: string): Promise~Role~
        -invalidateRoleCache(roleId: string): void
    }
    
    class PermissionRepository {
        -db: Database
        -permissionCollection: string
        -roleCollection: string
        -userRoleCollection: string
        +findPermissionsByUser(userId: string): Promise~Permission[]~
        +findPermissionsByRole(roleId: string): Promise~Permission[]~
        +findRolesByUser(userId: string): Promise~string[]~
        +findRole(roleId: string): Promise~Role~
        +findRoles(roleIds: string[]): Promise~Role[]~
        +createRole(role: RoleCreationData): Promise~Role~
        +updateRole(roleId: string, updates: RoleUpdateData): Promise~Role~
        +deleteRole(roleId: string): Promise~void~
        +assignRole(userId: string, roleId: string): Promise~void~
        +removeRole(userId: string, roleId: string): Promise~void~
        +addPermission(roleId: string, permission: string): Promise~void~
        +removePermission(roleId: string, permission: string): Promise~void~
    }
    
    class ResourcePermissions {
        -resourceRepository: ResourceRepository
        -permissionService: PermissionService
        -userService: UserService
        -eventMediator: EventMediator
        -resourceCache: ResourcePermissionCache
        +hasResourcePermission(userId: string, resourceType: string, resourceId: string, action: string): Promise~boolean~
        +getResourcePermissions(userId: string, resourceType: string, resourceId: string): Promise~ResourcePermissionSet~
        +grantPermission(resourceType: string, resourceId: string, userId: string, permission: string): Promise~void~
        +revokePermission(resourceType: string, resourceId: string, userId: string, permission: string): Promise~void~
        +getResourceVisibility(resourceType: string, resourceId: string): Promise~Visibility~
        +setResourceVisibility(resourceType: string, resourceId: string, visibility: Visibility): Promise~void~
        +getAccessibleResources(userId: string, resourceType: string, action: string): Promise~FilterQuery~
        -resolveOwnership(userId: string, resource: any): boolean
        -resolveOrganizationAccess(userId: string, resource: any): Promise~boolean~
        -resolveVisibilityAccess(userId: string, resource: any): boolean
        -getCachedResourcePermissions(resourceType: string, resourceId: string): Promise~ResourcePermissionSet~
        -invalidateResourceCache(resourceType: string, resourceId: string): void
    }
    
    class PermissionRuleEngine {
        -ruleRegistry: Map~string, PermissionRule~
        -eventMediator: EventMediator
        -ruleResultCache: PermissionRuleCache
        +registerRule(rule: PermissionRule): void
        +evaluateRules(context: PermissionContext): Promise~RuleResult[]~
        +evaluateRule(ruleId: string, context: PermissionContext): Promise~RuleResult~
        +getRulesByResource(resourceType: string): PermissionRule[]
        +getRulesByAction(action: string): PermissionRule[]
        -getCachedRuleResult(ruleId: string, contextHash: string): Promise~RuleResult~
        -cacheRuleResult(ruleId: string, contextHash: string, result: RuleResult): void
    }
    
    class PermissionContext {
        +user: User
        +resource: ResourceInfo
        +action: string
        +organizationContext?: Organization
        +metadata: Record~string, any~
    }
    
    class PermissionEndpoints {
        <<enumeration>>
        CHECK: "/api/permissions/check"
        USER_PERMISSIONS: "/api/permissions/user"
        RESOURCE_PERMISSIONS: "/api/permissions/resource/:type/:id"
        ROLES: "/api/roles"
        ROLE: "/api/roles/:id"
        ASSIGN_ROLE: "/api/roles/:id/assign"
        REVOKE_ROLE: "/api/roles/:id/revoke"
    }
    
    %% Relationships
    PermissionFacade --> PermissionService : uses
    PermissionFacade --> RoleService : uses
    PermissionFacade --> ResourcePermissions : uses
    
    PermissionService --> PermissionRepository : uses
    PermissionService --> RoleService : uses
    PermissionService --> PermissionRuleEngine : uses
    
    RoleService --> PermissionRepository : uses
    
    ResourcePermissions --> PermissionService : uses
    
    PermissionRuleEngine --> PermissionContext : evaluates```

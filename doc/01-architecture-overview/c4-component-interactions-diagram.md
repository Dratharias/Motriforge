```mermaid
classDiagram
    %% C4 Component Diagram - Focused on Interactions
    
    %% External Actors/Systems
    class Client["Client Application"]
    class ExternalIdP["External Identity Providers"]
    class Database["Database System"]
    
    %% Core Facades
    class AuthFacade["Auth Facade"]
    class PermissionFacade["Permission Facade"]
    class OrganizationFacade["Organization Facade"]
    class CacheFacade["Cache Facade"]
    
    %% Services Layer
    class AuthService["Auth Service"]
    class TokenService["Token Service"]
    class UserService["User Service"]
    class PermissionService["Permission Service"]
    class RoleService["Role Service"]
    class ResourcePermissions["Resource Permissions"]
    class OrganizationService["Organization Service"]
    class MembershipService["Membership Service"]
    class CacheManager["Cache Manager"]
    
    %% Strategy Registry
    class StrategyRegistry["Strategy Registry"]
    
    %% Integration Layer
    class EventMediator["Event Mediator"]
    class ApiGateway["API Gateway"]
    class ApiClient["API Client"]
    
    %% Repositories
    class Repositories["Data Repositories"]
    
    %% Client Interactions
    Client --> ApiGateway : "Makes API requests"
    ApiGateway --> AuthFacade : "Routes auth requests"
    ApiGateway --> PermissionFacade : "Routes permission requests" 
    ApiGateway --> OrganizationFacade : "Routes organization requests"
    Client --> ApiClient : "Uses for API communication"
    ApiClient --> ApiGateway : "Sends HTTP requests"
    
    %% Facade Interactions
    AuthFacade --> AuthService : "Coordinates auth operations"
    AuthFacade --> TokenService : "Manages tokens"
    AuthFacade --> UserService : "Manages user accounts"
    AuthFacade --> CacheFacade : "Caches auth data"
    
    PermissionFacade --> PermissionService : "Evaluates permissions"
    PermissionFacade --> RoleService : "Manages roles"
    PermissionFacade --> ResourcePermissions : "Checks resource access"
    PermissionFacade --> CacheFacade : "Caches permission data"
    
    OrganizationFacade --> OrganizationService : "Manages organizations"
    OrganizationFacade --> MembershipService : "Manages members"
    OrganizationFacade --> CacheFacade : "Caches organization data"
    
    %% Service Interactions
    AuthService --> StrategyRegistry : "Uses auth strategies"
    AuthService --> TokenService : "Creates/validates tokens"
    AuthService --> EventMediator : "Publishes auth events"
    
    StrategyRegistry --> ExternalIdP : "Authenticates with external providers"
    
    TokenService --> Repositories : "Stores tokens"
    UserService --> Repositories : "Stores user data"
    PermissionService --> Repositories : "Stores permissions"
    OrganizationService --> Repositories : "Stores organization data"
    
    %% Event Flow
    EventMediator --> CacheFacade : "Triggers cache invalidation"
    AuthService --> EventMediator : "Publishes auth events"
    UserService --> EventMediator : "Publishes user events"
    PermissionService --> EventMediator : "Publishes permission events"
    OrganizationService --> EventMediator : "Publishes org events"
    
    %% Cache Interactions
    CacheFacade --> CacheManager : "Manages caching operations"
    
    %% Data Access
    Repositories --> Database : "Persists data"```

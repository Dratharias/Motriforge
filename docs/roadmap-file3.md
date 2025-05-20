# Roadmap d'Implémentation - Partie 3 : Surveillance, API et Couche Frontend

## Services de Domaine Backend (suite)

### 15. Santé & Surveillance
- [ ] `HealthMonitor` (`src/core/monitoring/HealthMonitor.ts`) [B] `health-monitoring-system-diagram`
- [ ] `DatabaseHealthCheck` (`src/core/monitoring/checks/DatabaseHealthCheck.ts`) [B] `health-monitoring-system-diagram`
- [ ] `CacheHealthCheck` (`src/core/monitoring/checks/CacheHealthCheck.ts`) [B] `health-monitoring-system-diagram`
- [ ] `ApiHealthCheck` (`src/core/monitoring/checks/ApiHealthCheck.ts`) [B] `health-monitoring-system-diagram`
- [ ] `MemoryHealthCheck` (`src/core/monitoring/checks/MemoryHealthCheck.ts`) [B] `health-monitoring-system-diagram`
- [ ] `SearchEngineHealthCheck` (`src/core/monitoring/checks/SearchEngineHealthCheck.ts`) [B] `health-monitoring-system-diagram`
- [ ] `StorageHealthCheck` (`src/core/monitoring/checks/StorageHealthCheck.ts`) [B] `health-monitoring-system-diagram`
- [ ] `CompositeHealthCheck` (`src/core/monitoring/checks/CompositeHealthCheck.ts`) [B] `health-monitoring-system-diagram`
- [ ] `AlertService` (`src/core/monitoring/AlertService.ts`) [B] `health-monitoring-system-diagram`
- [ ] `AlertRule` (`src/core/monitoring/AlertRule.ts`) [B] `health-monitoring-system-diagram`
- [ ] `HealthEndpointHandler` (`src/core/monitoring/HealthEndpointHandler.ts`) [B] `health-monitoring-system-diagram`
- [ ] `HealthDashboard` (`src/core/monitoring/HealthDashboard.ts`) [B] `health-monitoring-system-diagram`
- [ ] `CircuitBreaker` (`src/core/monitoring/CircuitBreaker.ts`) [B] `health-monitoring-system-diagram`
- [ ] `CircuitBreakerRegistry` (`src/core/monitoring/CircuitBreakerRegistry.ts`) [B] `health-monitoring-system-diagram`

### 16. Stratégies & Registres
- [ ] `AuthStrategyRegistry` (`src/core/auth/StrategyRegistry.ts`) [B] `strategy-registry-diagram`
- [ ] `StrategyRegistry` (`src/core/auth/StrategyRegistry.ts`) [B] `strategy-registry-diagram`
- [ ] `BaseAuthStrategy` (`src/core/auth/strategies/BaseAuthStrategy.ts`) [B] `auth-strategy-diagram`
- [ ] `EmailPasswordStrategy` (`src/core/auth/strategies/EmailPasswordStrategy.ts`) [B] `auth-strategy-diagram`
- [ ] `OAuthStrategy` (`src/core/auth/strategies/OAuthStrategy.ts`) [B] `auth-strategy-diagram`
- [ ] `MagicLinkStrategy` (`src/core/auth/strategies/MagicLinkStrategy.ts`) [B] `auth-strategy-diagram`
- [ ] `WebAuthnStrategy` (`src/core/auth/strategies/WebAuthnStrategy.ts`) [B] `auth-strategy-diagram`
- [ ] `JwtStrategy` (`src/core/auth/strategies/JwtStrategy.ts`) [B] `auth-strategy-diagram`
- [ ] `AuthStrategyDecorator` (`src/core/auth/strategies/decorators/AuthStrategyDecorator.ts`) [B] `auth-strategy-diagram`
- [ ] `MFAStrategyDecorator` (`src/core/auth/strategies/decorators/MFAStrategyDecorator.ts`) [B] `auth-strategy-diagram`
- [ ] `RateLimitStrategyDecorator` (`src/core/auth/strategies/decorators/RateLimitStrategyDecorator.ts`) [B] `auth-strategy-diagram`
- [ ] `PermissionStrategyRegistry` (`src/core/permission/PermissionStrategyRegistry.ts`) [B] `permission-system-diagram`
- [ ] `ResourcePermissionStrategy` (`src/core/permission/strategies/ResourcePermissionStrategy.ts`) [B] `permission-system-diagram`
- [ ] `RoleBasedPermissionStrategy` (`src/core/permission/strategies/RoleBasedPermissionStrategy.ts`) [B] `permission-system-diagram`
- [ ] `OwnershipPermissionStrategy` (`src/core/permission/strategies/OwnershipPermissionStrategy.ts`) [B] `permission-system-diagram`
- [ ] `PermissionRuleEngine` (`src/core/permission/PermissionRuleEngine.ts`) [B] `permission-system-diagram`

## Couche API Backend

### 17. Façades
- [ ] `AuthFacade` (`src/domain/facades/AuthFacade.ts`) [B] `auth-facade-diagram`
- [ ] `PermissionFacade` (`src/domain/facades/PermissionFacade.ts`) [B] `permission-facade-diagram`
- [ ] `OrganizationFacade` (`src/domain/facades/OrganizationFacade.ts`) [B] `organization-facade-diagram`
- [ ] `CacheFacade` (`src/domain/facades/CacheFacade.ts`) [B] `cache-facade-diagram`
- [ ] `TranslationFacade` (`src/domain/facades/TranslationFacade.ts`) [B] `translation-system-diagram`
- [ ] `LoggerFacade` (`src/domain/facades/LoggerFacade.ts`) [B] `logging-system-diagram`
- [ ] `ErrorHandlingFacade` (`src/domain/facades/ErrorHandlingFacade.ts`) [B] `error-handling-system-diagram`
- [ ] `ProgressionFacade` (`src/domain/facades/ProgressionFacade.ts`) [B] `progression-tracking-system`
- [ ] `TrainerFacade` (`src/domain/facades/TrainerFacade.ts`) [B] `trainer-client-system`

### 18. Contrôleurs
- [ ] `BaseController` (`src/api/controllers/BaseController.ts`) [B] `controller-layer-diagram`
- [ ] `AuthController` (`src/api/controllers/auth/AuthController.ts`) [B] `controller-layer-diagram`
- [ ] `UserController` (`src/api/controllers/user/UserController.ts`) [B] `controller-layer-diagram`
- [ ] `ExerciseController` (`src/api/controllers/exercise/ExerciseController.ts`) [B] `controller-layer-diagram`
- [ ] `WorkoutController` (`src/api/controllers/workout/WorkoutController.ts`) [B] `controller-layer-diagram`
- [ ] `ProgramController` (`src/api/controllers/program/ProgramController.ts`) [B] `controller-layer-diagram`
- [ ] `ActivityController` (`src/api/controllers/activity/ActivityController.ts`) [B] `controller-layer-diagram`
- [ ] `FavoriteController` (`src/api/controllers/favorite/FavoriteController.ts`) [B] `controller-layer-diagram`
- [ ] `MediaController` (`src/api/controllers/media/MediaController.ts`) [B] `controller-layer-diagram`
- [ ] `OrganizationController` (`src/api/controllers/organization/OrganizationController.ts`) [B] `controller-layer-diagram`
- [ ] `HonoCrudController` (`src/api/controllers/HonoCrudController.ts`) [B] `controller-layer-diagram`
- [ ] `GenericHonoHandler` (`src/api/controllers/GenericHonoHandler.ts`) [B] `controller-layer-diagram`
- [ ] `HonoApiFactory` (`src/api/controllers/HonoApiFactory.ts`) [B] `controller-layer-diagram`
- [ ] `ProgressionController` (`src/api/controllers/progression/ProgressionController.ts`) [B] `progression-tracking-system`
- [ ] `GoalController` (`src/api/controllers/progression/GoalController.ts`) [B] `progression-tracking-system`
- [ ] `TrainerController` (`src/api/controllers/trainer/TrainerController.ts`) [B] `trainer-client-system`
- [ ] `ClientCoachController` (`src/api/controllers/trainer/ClientCoachController.ts`) [B] `trainer-client-system`
- [ ] `CoachingSessionController` (`src/api/controllers/trainer/CoachingSessionController.ts`) [B] `trainer-client-system`
- [ ] `TrainerFeedbackController` (`src/api/controllers/trainer/TrainerFeedbackController.ts`) [B] `trainer-client-system`

### 19. Routes & Points de Terminaison
- [ ] `Route` (`src/api/routes/Route.ts`) [B] `api-routes-diagram`
- [ ] `RouteHandler` (`src/api/routes/RouteHandler.ts`) [B] `api-routes-diagram`
- [ ] `RouteGroup` (`src/api/routes/RouteGroup.ts`) [B] `api-routes-diagram`
- [ ] `AuthRoutes` (`src/api/routes/auth.routes.ts`) [B] `api-routes-diagram`
- [ ] `UserRoutes` (`src/api/routes/user.routes.ts`) [B] `api-routes-diagram`
- [ ] `ExerciseRoutes` (`src/api/routes/exercise.routes.ts`) [B] `api-routes-diagram`
- [ ] `WorkoutRoutes` (`src/api/routes/workout.routes.ts`) [B] `api-routes-diagram`
- [ ] `ProgramRoutes` (`src/api/routes/program.routes.ts`) [B] `api-routes-diagram`
- [ ] `OrganizationRoutes` (`src/api/routes/organization.routes.ts`) [B] `api-routes-diagram`
- [ ] `ActivityRoutes` (`src/api/routes/activity.routes.ts`) [B] `api-routes-diagram`
- [ ] `FavoriteRoutes` (`src/api/routes/favorite.routes.ts`) [B] `api-routes-diagram`
- [ ] `MediaRoutes` (`src/api/routes/media.routes.ts`) [B] `api-routes-diagram`
- [ ] `SearchRoutes` (`src/api/routes/search.routes.ts`) [B] `api-routes-diagram`
- [ ] `HealthRoutes` (`src/api/routes/health.routes.ts`) [B] `api-routes-diagram`
- [ ] `ProgressionRoutes` (`src/api/routes/progression.routes.ts`) [B] `progression-tracking-system`
- [ ] `TrainerRoutes` (`src/api/routes/trainer.routes.ts`) [B] `trainer-client-system`
- [ ] `AuthEndpoints` (`src/api/constants/AuthEndpoints.ts`) [B] `auth-facade-diagram`
- [ ] `APIEndpoints` (`src/api/constants/APIEndpoints.ts`) [B] `api-gateway`
- [ ] `OrganizationEndpoints` (`src/api/constants/OrganizationEndpoints.ts`) [B] `organization-facade-diagram`
- [ ] `PermissionEndpoints` (`src/api/constants/PermissionEndpoints.ts`) [B] `permission-facade-diagram`
- [ ] `CacheEndpoints` (`src/api/constants/CacheEndpoints.ts`) [B] `cache-facade-diagram`

### 20. Middlewares
- [ ] `MiddlewareRegistry` (`src/api/middleware/MiddlewareRegistry.ts`) [B] `middleware-pipeline-diagram`
- [ ] `NextFunction` (`src/api/middleware/NextFunction.ts`) [B] `middleware-pipeline-diagram`
- [ ] `DatabaseMiddleware` (`src/api/middleware/DatabaseMiddleware.ts`) [B] `middleware-pipeline-diagram`
- [ ] `HonoAuthMiddleware` (`src/api/middleware/HonoAuthMiddleware.ts`) [B] `middleware-pipeline-diagram`
- [ ] `HonoErrorHandler` (`src/api/middleware/HonoErrorHandler.ts`) [B] `middleware-pipeline-diagram`
- [ ] `HonoPermissionMiddleware` (`src/api/middleware/HonoPermissionMiddleware.ts`) [B] `middleware-pipeline-diagram`
- [ ] `HonoValidationMiddleware` (`src/api/middleware/HonoValidationMiddleware.ts`) [B] `middleware-pipeline-diagram`
- [ ] `CacheControlMiddleware` (`src/api/middleware/CacheControlMiddleware.ts`) [B] `middleware-pipeline-diagram`
- [ ] `RateLimitMiddleware` (`src/api/middleware/RateLimitMiddleware.ts`) [B] `middleware-pipeline-diagram`
- [ ] `LoggingMiddleware` (`src/api/middleware/LoggingMiddleware.ts`) [B] `middleware-pipeline-diagram`
- [ ] `CorsMiddleware` (`src/api/middleware/CorsMiddleware.ts`) [B] `middleware-pipeline-diagram`
- [ ] `TranslationMiddleware` (`src/api/middleware/TranslationMiddleware.ts`) [B] `translation-system-diagram`

### 21. Passerelle API & Adaptateurs
- [ ] `APIGateway` (`src/api/gateway/APIGateway.ts`) [B] `api-gateway`
- [ ] `ApiAdapter` (`src/api/gateway/ApiAdapter.ts`) [B] `api-gateway`
- [ ] `APIRouter` (`src/api/gateway/APIRouter.ts`) [B] `api-routes-diagram`
- [ ] `RouteRegistry` (`src/api/gateway/RouteRegistry.ts`) [B] `api-gateway`
- [ ] `ErrorHandlerRegistry` (`src/api/gateway/ErrorHandlerRegistry.ts`) [B] `api-gateway`
- [ ] `ApplicationAPI` (`src/api/gateway/ApplicationAPI.ts`) [B] `api-routes-diagram`
- [ ] `HonoApiRouter` (`src/api/gateway/HonoApiRouter.ts`) [B] `api-routes-diagram`

## Infrastructure Frontend

### 22. Infrastructure UI Core
- [ ] `ThemeManager` (`src/styles/theme/ThemeManager.ts`) [F] `theme-management-diagram`
- [ ] `Theme` (`src/styles/theme/Theme.ts`) [F] `theme-management-diagram`
- [ ] `ThemeColors` (`src/styles/theme/ThemeColors.ts`) [F] `theme-management-diagram`
- [ ] `ThemeFactory` (`src/styles/theme/ThemeFactory.ts`) [F] `theme-management-diagram`
- [ ] `ThemeRegistry` (`src/styles/theme/ThemeRegistry.ts`) [F] `theme-management-diagram`
- [ ] `LazyThemeLoader` (`src/styles/theme/LazyThemeLoader.ts`) [F] `theme-management-diagram`
- [ ] `ThemeService` (`src/styles/theme/ThemeService.ts`) [F] `theme-management-diagram`
- [ ] `ThemeHelpers` (`src/styles/theme/ThemeHelpers.ts`) [F] `theme-management-diagram`
- [ ] `ThemeContext` (`src/context/ThemeContext.tsx`) [F] `theme-management-diagram`
- [ ] `TranslationFacade` (`src/i18n/TranslationFacade.ts`) [F] `translation-system-diagram`
- [ ] `TranslationService` (`src/i18n/TranslationService.ts`) [F] `translation-system-diagram`
- [ ] `LocaleProvider` (`src/i18n/LocaleProvider.ts`) [F] `translation-system-diagram`
- [ ] `MessageStore` (`src/i18n/MessageStore.ts`) [F] `translation-system-diagram`
- [ ] `FileMessageLoader` (`src/i18n/FileMessageLoader.ts`) [F] `translation-system-diagram`
- [ ] `RemoteMessageLoader` (`src/i18n/RemoteMessageLoader.ts`) [F] `translation-system-diagram`
- [ ] `MessageBundleCompiler` (`src/i18n/MessageBundleCompiler.ts`) [F] `translation-system-diagram`
- [ ] `DateTimeFormatter` (`src/i18n/formatters/DateTimeFormatter.ts`) [F] `translation-system-diagram`
- [ ] `NumberFormatter` (`src/i18n/formatters/NumberFormatter.ts`) [F] `translation-system-diagram`
- [ ] `TranslationCache` (`src/i18n/TranslationCache.ts`) [F] `translation-system-diagram`
- [ ] `LocaleDetector` (`src/i18n/LocaleDetector.ts`) [F] `translation-system-diagram`
- [ ] `HeaderStrategy` (`src/i18n/detectors/HeaderStrategy.ts`) [F] `translation-system-diagram`
- [ ] `QueryParamStrategy` (`src/i18n/detectors/QueryParamStrategy.ts`) [F] `translation-system-diagram`
- [ ] `CookieStrategy` (`src/i18n/detectors/CookieStrategy.ts`) [F] `translation-system-diagram`
- [ ] `ErrorBoundary` (`src/components/common/ErrorBoundary/ErrorBoundary.tsx`) [F] `error-handling-system-diagram`

### 23. Gestion des Données
- [ ] `ApiClient` (`src/api/client/ApiClient.ts`) [F] `api-gateway`
- [ ] `CachedApiClient` (`src/api/client/CachedApiClient.ts`) [F] `api-gateway`
- [ ] `FilterEngine` (`src/data/filtering/FilterEngine.ts`) [F] `filtering-architecture-diagram`
- [ ] `FilterRegistry` (`src/data/filtering/FilterRegistry.ts`) [F] `filtering-architecture-diagram`
- [ ] `SortRegistry` (`src/data/filtering/SortRegistry.ts`) [F] `filtering-architecture-diagram`
- [ ] `PaginationManager` (`src/data/filtering/PaginationManager.ts`) [F] `filtering-architecture-diagram`
- [ ] `TextFilter` (`src/data/filtering/filters/TextFilter.ts`) [F] `filtering-architecture-diagram`
- [ ] `NumericRangeFilter` (`src/data/filtering/filters/NumericRangeFilter.ts`) [F] `filtering-architecture-diagram`
- [ ] `EnumFilter` (`src/data/filtering/filters/EnumFilter.ts`) [F] `filtering-architecture-diagram`
- [ ] `DateRangeFilter` (`src/data/filtering/filters/DateRangeFilter.ts`) [F] `filtering-architecture-diagram`
- [ ] `RelationshipFilter` (`src/data/filtering/filters/RelationshipFilter.ts`) [F] `filtering-architecture-diagram`
- [ ] `CompositeFilter` (`src/data/filtering/filters/CompositeFilter.ts`) [F] `filtering-architecture-diagram`
- [ ] `FullTextSearchFilter` (`src/data/filtering/filters/FullTextSearchFilter.ts`) [F] `filtering-architecture-diagram`

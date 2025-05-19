# MōtriForge Project Directory Structure

Below is a comprehensive directory structure for the MōtriForge project, organized into frontend and backend sections.

## Backend Structure

```
motriforge/backend/src/
│
├── api/                              # API Layer
│   ├── controllers/                  # Request handlers
│   │   ├── auth/
│   │   │   ├── AuthController.ts
│   │   │   ├── LoginController.ts
│   │   │   ├── OAuthController.ts
│   │   │   └── MagicLinkController.ts
│   │   ├── user/
│   │   │   └── UserController.ts
│   │   ├── exercise/
│   │   │   └── ExerciseController.ts
│   │   ├── workout/
│   │   │   └── WorkoutController.ts
│   │   ├── program/
│   │   │   └── ProgramController.ts
│   │   ├── activity/
│   │   │   └── ActivityController.ts
│   │   ├── favorite/
│   │   │   └── FavoriteController.ts
│   │   ├── media/
│   │   │   └── MediaController.ts
│   │   ├── organization/
│   │   │   └── OrganizationController.ts
│   │   ├── BaseController.ts
│   │   └── index.ts
│   │
│   ├── routes/                       # Route definitions
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── exercise.routes.ts
│   │   ├── workout.routes.ts
│   │   ├── program.routes.ts
│   │   ├── activity.routes.ts
│   │   ├── favorite.routes.ts
│   │   ├── media.routes.ts
│   │   ├── organization.routes.ts
│   │   ├── health.routes.ts
│   │   └── index.ts
│   │
│   ├── middleware/                   # Middleware components
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── permission.middleware.ts
│   │   ├── logging.middleware.ts
│   │   ├── cache.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── cors.middleware.ts
│   │   └── index.ts
│   │
│   ├── validators/                   # Input validation
│   │   ├── auth.validator.ts
│   │   ├── user.validator.ts
│   │   ├── exercise.validator.ts
│   │   ├── workout.validator.ts
│   │   ├── program.validator.ts
│   │   └── index.ts
│   │
│   ├── gateway/                      # API Gateway
│   │   ├── ApiGateway.ts
│   │   ├── MiddlewareRegistry.ts
│   │   ├── RouteRegistry.ts
│   │   └── ErrorHandlerRegistry.ts
│   │
│   └── index.ts                      # API module exports
│
├── core/                             # Core modules
│   ├── auth/                         # Authentication
│   │   ├── strategies/               # Auth strategies
│   │   │   ├── EmailPasswordStrategy.ts
│   │   │   ├── OAuthStrategy.ts
│   │   │   ├── MagicLinkStrategy.ts
│   │   │   ├── WebAuthnStrategy.ts
│   │   │   ├── JwtStrategy.ts
│   │   │   └── decorators/
│   │   │       ├── MFAStrategyDecorator.ts
│   │   │       └── RateLimitStrategyDecorator.ts
│   │   ├── AuthStrategy.ts           # Strategy interface
│   │   ├── StrategyRegistry.ts       # Strategy registration
│   │   ├── TokenService.ts           # Token management
│   │   ├── MFAService.ts             # Multi-factor auth
│   │   ├── PasswordHasher.ts         # Password hashing
│   │   └── index.ts
│   │
│   ├── cache/                        # Caching system
│   │   ├── adapters/
│   │   │   ├── MemoryCacheAdapter.ts
│   │   │   ├── LocalStorageCacheAdapter.ts
│   │   │   └── RedisLikeCacheAdapter.ts
│   │   ├── strategies/
│   │   │   ├── CacheFetchStrategy.ts
│   │   │   └── CacheStaleWhileRevalidateStrategy.ts
│   │   ├── CacheManager.ts
│   │   ├── CacheEventMediator.ts
│   │   ├── InvalidationPattern.ts
│   │   ├── CacheInvalidationHandler.ts
│   │   ├── CacheHealthMonitor.ts
│   │   └── index.ts
│   │
│   ├── constants/                    # Application constants
│   │   ├── ConstantsRegistry.ts
│   │   ├── ExerciseConstants.ts
│   │   ├── WorkoutConstants.ts
│   │   ├── ProgramConstants.ts
│   │   ├── MuscleConstants.ts
│   │   ├── UserConstants.ts
│   │   ├── OrganizationConstants.ts
│   │   ├── EquipmentConstants.ts
│   │   ├── ThemeConstants.ts
│   │   ├── LocaleConstants.ts
│   │   ├── PermissionConstants.ts
│   │   └── index.ts
│   │
│   ├── error/                        # Error handling
│   │   ├── ErrorHandlingFacade.ts
│   │   ├── ErrorHandlerRegistry.ts
│   │   ├── ErrorMapperRegistry.ts
│   │   ├── ErrorFormatterRegistry.ts
│   │   ├── handlers/
│   │   │   ├── ValidationErrorHandler.ts
│   │   │   ├── DatabaseErrorHandler.ts
│   │   │   └── AuthErrorHandler.ts
│   │   ├── mappers/
│   │   │   └── HttpErrorMapper.ts
│   │   ├── formatters/
│   │   │   ├── JsonErrorFormatter.ts
│   │   │   └── HtmlErrorFormatter.ts
│   │   ├── exceptions/
│   │   │   ├── ApplicationError.ts
│   │   │   ├── ValidationError.ts
│   │   │   ├── AuthError.ts
│   │   │   └── DatabaseError.ts
│   │   ├── ErrorLoggerService.ts
│   │   ├── ErrorFactory.ts
│   │   └── index.ts
│   │
│   ├── events/                       # Event system
│   │   ├── EventFacade.ts
│   │   ├── EventMediator.ts
│   │   ├── EventPublisher.ts
│   │   ├── EventQueue.ts
│   │   ├── EventRegistry.ts
│   │   ├── EventContextProvider.ts
│   │   ├── EventEnricher.ts
│   │   ├── handlers/
│   │   │   ├── AuthEventHandler.ts
│   │   │   ├── CacheInvalidationHandler.ts
│   │   │   ├── AuditEventHandler.ts
│   │   │   └── NotificationEventHandler.ts
│   │   ├── models/
│   │   │   ├── Event.ts
│   │   │   ├── DomainEvent.ts
│   │   │   ├── UserEvent.ts
│   │   │   ├── AuthEvent.ts
│   │   │   └── SystemEvent.ts
│   │   ├── publishers/
│   │   │   ├── DistributedEventPublisher.ts
│   │   │   ├── RedisEventPublisher.ts
│   │   │   └── KafkaEventPublisher.ts
│   │   ├── EventMetrics.ts
│   │   └── index.ts
│   │
│   ├── logging/                      # Logging system
│   │   ├── LoggerFacade.ts
│   │   ├── LoggerService.ts
│   │   ├── transports/
│   │   │   ├── ConsoleTransport.ts
│   │   │   ├── FileTransport.ts
│   │   │   └── CloudTransport.ts
│   │   ├── formatters/
│   │   │   ├── JsonFormatter.ts
│   │   │   └── SimpleFormatter.ts
│   │   ├── LogContextManager.ts
│   │   ├── LogMetrics.ts
│   │   ├── RequestLogEnricher.ts
│   │   └── index.ts
│   │
│   ├── monitoring/                   # Health monitoring
│   │   ├── HealthMonitor.ts
│   │   ├── checks/
│   │   │   ├── DatabaseHealthCheck.ts
│   │   │   ├── CacheHealthCheck.ts
│   │   │   ├── ApiHealthCheck.ts
│   │   │   ├── MemoryHealthCheck.ts
│   │   │   ├── SearchEngineHealthCheck.ts
│   │   │   ├── StorageHealthCheck.ts
│   │   │   └── CompositeHealthCheck.ts
│   │   ├── AlertService.ts
│   │   ├── CircuitBreaker.ts
│   │   ├── CircuitBreakerRegistry.ts
│   │   ├── HealthEndpointHandler.ts
│   │   ├── HealthDashboard.ts
│   │   └── index.ts
│   │
│   ├── permission/                   # Permission system
│   │   ├── PermissionManager.ts
│   │   ├── PermissionStrategyRegistry.ts
│   │   ├── strategies/
│   │   │   ├── ResourcePermissionStrategy.ts
│   │   │   ├── RoleBasedPermissionStrategy.ts
│   │   │   ├── OwnershipPermissionStrategy.ts
│   │   │   ├── ExercisePermissionStrategy.ts
│   │   │   └── WorkoutPermissionStrategy.ts
│   │   ├── PermissionRuleEngine.ts
│   │   ├── PermissionRule.ts
│   │   ├── PermissionCache.ts
│   │   └── index.ts
│   │
│   ├── translation/                  # Internationalization
│   │   ├── TranslationFacade.ts
│   │   ├── TranslationService.ts
│   │   ├── LocaleProvider.ts
│   │   ├── MessageStore.ts
│   │   ├── loaders/
│   │   │   ├── FileMessageLoader.ts
│   │   │   └── RemoteMessageLoader.ts
│   │   ├── formatters/
│   │   │   ├── DateTimeFormatter.ts
│   │   │   └── NumberFormatter.ts
│   │   ├── MessageBundleCompiler.ts
│   │   ├── TranslationCache.ts
│   │   ├── detectors/
│   │   │   ├── HeaderStrategy.ts
│   │   │   ├── QueryParamStrategy.ts
│   │   │   └── CookieStrategy.ts
│   │   └── index.ts
│   │
│   └── index.ts                      # Core module exports
│
├── data/                             # Data access layer
│   ├── database/                     # Database access
│   │   ├── Database.ts
│   │   ├── Collection.ts
│   │   ├── QueryBuilder.ts
│   │   ├── TransactionManager.ts
│   │   ├── Transaction.ts
│   │   └── TransactionOperation.ts
│   │
│   ├── repositories/                 # Repositories
│   │   ├── BaseRepository.ts
│   │   ├── UserRepository.ts
│   │   ├── OrganizationRepository.ts
│   │   ├── PermissionRepository.ts
│   │   ├── TokenRepository.ts
│   │   ├── ExerciseRepository.ts
│   │   ├── WorkoutRepository.ts
│   │   ├── ProgramRepository.ts
│   │   ├── ActivityRepository.ts
│   │   ├── FavoriteRepository.ts
│   │   ├── MediaRepository.ts
│   │   ├── NotificationRepository.ts
│   │   ├── AnalyticsRepository.ts
│   │   ├── SearchRepository.ts
│   │   ├── PushTokenRepository.ts
│   │   └── index.ts
│   │
│   ├── models/                       # Domain models
│   │   ├── User.ts
│   │   ├── Organization.ts
│   │   ├── OrganizationMember.ts
│   │   ├── Invitation.ts
│   │   ├── Exercise.ts
│   │   ├── ExerciseProgression.ts
│   │   ├── ExerciseAlternative.ts
│   │   ├── ExerciseMetric.ts
│   │   ├── Workout.ts
│   │   ├── WorkoutBlock.ts
│   │   ├── WorkoutExercise.ts
│   │   ├── Program.ts
│   │   ├── ProgramScheduleItem.ts
│   │   ├── Activity.ts
│   │   ├── ActivityEntry.ts
│   │   ├── Favorite.ts
│   │   ├── ExerciseSwap.ts
│   │   ├── Media.ts
│   │   ├── MediaVariant.ts
│   │   ├── Equipment.ts
│   │   ├── RefreshToken.ts
│   │   ├── Notification.ts
│   │   ├── NotificationAction.ts
│   │   ├── NotificationSettings.ts
│   │   ├── DeviceToken.ts
│   │   ├── Role.ts
│   │   └── index.ts
│   │
│   ├── dto/                          # Data Transfer Objects
│   │   ├── auth/
│   │   ├── user/
│   │   ├── exercise/
│   │   ├── workout/
│   │   ├── program/
│   │   ├── organization/
│   │   └── index.ts
│   │
│   ├── filtering/                    # Data filtering
│   │   ├── FilterEngine.ts
│   │   ├── FilterRegistry.ts
│   │   ├── filters/
│   │   │   ├── TextFilter.ts
│   │   │   ├── NumericRangeFilter.ts
│   │   │   ├── EnumFilter.ts
│   │   │   ├── DateRangeFilter.ts
│   │   │   ├── RelationshipFilter.ts
│   │   │   ├── CompositeFilter.ts
│   │   │   └── FullTextSearchFilter.ts
│   │   ├── SortRegistry.ts
│   │   ├── PaginationManager.ts
│   │   ├── domain/
│   │   │   ├── ExerciseFilters.ts
│   │   │   ├── WorkoutFilters.ts
│   │   │   └── UserFilters.ts
│   │   └── index.ts
│   │
│   └── index.ts                      # Data module exports
│
├── domain/                           # Business logic
│   ├── services/                     # Domain services
│   │   ├── BaseService.ts
│   │   ├── AuthService.ts
│   │   ├── UserService.ts
│   │   ├── OrganizationService.ts
│   │   ├── MembershipService.ts
│   │   ├── ExerciseService.ts
│   │   ├── WorkoutService.ts
│   │   ├── ProgramService.ts 
│   │   ├── ActivityService.ts
│   │   ├── FavoriteService.ts
│   │   ├── MediaService.ts
│   │   ├── NotificationService.ts
│   │   ├── AnalyticsService.ts
│   │   ├── PermissionService.ts
│   │   ├── RoleService.ts
│   │   ├── SearchService.ts
│   │   └── index.ts
│   │
│   ├── facades/                      # Facades
│   │   ├── AuthFacade.ts
│   │   ├── PermissionFacade.ts
│   │   ├── OrganizationFacade.ts
│   │   ├── CacheFacade.ts
│   │   └── index.ts
│   │
│   ├── notification/                 # Notification system
│   │   ├── NotificationChannelManager.ts
│   │   ├── senders/
│   │   │   ├── EmailNotificationSender.ts
│   │   │   ├── PushNotificationSender.ts
│   │   │   ├── InAppNotificationSender.ts
│   │   │   └── SMSNotificationSender.ts
│   │   ├── NotificationTemplateService.ts
│   │   ├── PushService.ts
│   │   ├── EmailService.ts
│   │   ├── SMSService.ts
│   │   └── index.ts
│   │
│   ├── analytics/                    # Analytics system
│   │   ├── MetricsCollector.ts
│   │   ├── metrics/
│   │   │   ├── CounterMetric.ts
│   │   │   ├── GaugeMetric.ts
│   │   │   ├── HistogramMetric.ts
│   │   │   └── TimerMetric.ts
│   │   ├── ReportGenerator.ts
│   │   ├── DashboardService.ts
│   │   └── index.ts
│   │
│   ├── media/                        # Media handling
│   │   ├── StorageProvider.ts
│   │   ├── providers/
│   │   │   ├── CloudflareR2Provider.ts
│   │   │   └── LocalFileSystemProvider.ts
│   │   ├── MetadataExtractor.ts
│   │   ├── ThumbnailGenerator.ts
│   │   ├── MediaQueue.ts
│   │   ├── ProcessingManager.ts
│   │   ├── processors/
│   │   │   ├── ImageProcessor.ts
│   │   │   └── VideoProcessor.ts
│   │   ├── UserStorageManager.ts
│   │   ├── ImageOptimizationService.ts
│   │   └── index.ts
│   │
│   ├── search/                       # Search system
│   │   ├── SearchEngine.ts
│   │   ├── engines/
│   │   │   ├── ElasticsearchEngine.ts
│   │   │   └── InMemorySearchEngine.ts
│   │   ├── IndexManager.ts
│   │   ├── builders/
│   │   │   ├── ExerciseIndexBuilder.ts
│   │   │   └── WorkoutIndexBuilder.ts
│   │   ├── SearchEventHandler.ts
│   │   ├── TextAnalyzer.ts
│   │   ├── IndexScheduler.ts
│   │   └── index.ts
│   │
│   └── index.ts                      # Domain module exports
│
├── infrastructure/                   # Infrastructure
│   ├── server/                       # Server setup
│   │   ├── Server.ts
│   │   ├── AppConfig.ts
│   │   ├── ServerOptions.ts
│   │   └── index.ts
│   │
│   ├── config/                       # Configuration
│   │   ├── config.ts
│   │   ├── environment.ts
│   │   ├── auth.config.ts
│   │   ├── cache.config.ts
│   │   ├── database.config.ts
│   │   ├── logging.config.ts
│   │   ├── media.config.ts
│   │   └── index.ts
│   │
│   ├── di/                           # Dependency injection
│   │   ├── ServiceRegistry.ts
│   │   ├── container.ts
│   │   └── index.ts
│   │
│   └── index.ts                      # Infrastructure exports
│
├── utils/                            # Utilities
│   ├── validation.ts
│   ├── security.ts
│   ├── date.ts
│   ├── string.ts
│   ├── object.ts
│   ├── async.ts
│   └── index.ts
│
└── index.ts                          # Main application entry
```

## Frontend Structure

```
motriforge/frontend/src/
│
├── api/                              # API communication
│   ├── client/
│   │   ├── ApiClient.ts
│   │   ├── CachedApiClient.ts
│   │   └── index.ts
│   │
│   ├── services/                     # API service adapters
│   │   ├── AuthService.ts
│   │   ├── UserService.ts
│   │   ├── ExerciseService.ts
│   │   ├── WorkoutService.ts
│   │   ├── ProgramService.ts
│   │   ├── OrganizationService.ts
│   │   ├── MediaService.ts
│   │   ├── NotificationService.ts
│   │   └── index.ts
│   │
│   ├── hooks/                        # API custom hooks
│   │   ├── auth/
│   │   │   ├── useAuth.ts
│   │   │   ├── useLogin.ts
│   │   │   └── useRegister.ts
│   │   ├── user/
│   │   │   ├── useUser.ts
│   │   │   └── useProfile.ts
│   │   ├── exercise/
│   │   │   ├── useExercises.ts
│   │   │   └── useExerciseDetails.ts
│   │   └── index.ts
│   │
│   └── index.ts                      # API module exports
│
├── components/                       # UI components
│   ├── common/                       # Shared components
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.module.css
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Card/
│   │   ├── Modal/
│   │   ├── Dropdown/
│   │   ├── Tabs/
│   │   ├── Table/
│   │   ├── Pagination/
│   │   ├── ErrorBoundary/
│   │   ├── LoadingIndicator/
│   │   ├── Toast/
│   │   └── index.ts
│   │
│   ├── layout/                       # Layout components
│   │   ├── Navbar/
│   │   ├── Sidebar/
│   │   ├── Footer/
│   │   ├── Page/
│   │   ├── Dashboard/
│   │   └── index.ts
│   │
│   ├── auth/                         # Authentication components
│   │   ├── LoginForm/
│   │   ├── RegisterForm/
│   │   ├── ForgotPasswordForm/
│   │   ├── ResetPasswordForm/
│   │   ├── MFAForm/
│   │   └── index.ts
│   │
│   ├── user/                         # User components
│   │   ├── UserProfile/
│   │   ├── UserSettings/
│   │   ├── Avatar/
│   │   └── index.ts
│   │
│   ├── exercise/                     # Exercise components
│   │   ├── ExerciseList/
│   │   ├── ExerciseCard/
│   │   ├── ExerciseDetail/
│   │   ├── ExerciseForm/
│   │   ├── MuscleGroupSelector/
│   │   └── index.ts
│   │
│   ├── workout/                      # Workout components
│   │   ├── WorkoutList/
│   │   ├── WorkoutDetail/
│   │   ├── WorkoutBuilder/
│   │   ├── WorkoutSchedule/
│   │   ├── ExerciseSelector/
│   │   └── index.ts
│   │
│   ├── program/                      # Program components
│   │   ├── ProgramList/
│   │   ├── ProgramDetail/
│   │   ├── ProgramBuilder/
│   │   ├── ProgramProgress/
│   │   └── index.ts
│   │
│   ├── organization/                 # Organization components
│   │   ├── OrganizationList/
│   │   ├── OrganizationDetail/
│   │   ├── MemberManagement/
│   │   ├── InviteForm/
│   │   └── index.ts
│   │
│   ├── media/                        # Media components
│   │   ├── MediaUploader/
│   │   ├── MediaGallery/
│   │   ├── MediaPlayer/
│   │   └── index.ts
│   │
│   ├── notifications/                # Notification components
│   │   ├── NotificationCenter/
│   │   ├── NotificationList/
│   │   ├── NotificationBadge/
│   │   └── index.ts
│   │
│   ├── search/                       # Search components
│   │   ├── SearchBar/
│   │   ├── SearchResults/
│   │   ├── FilterBuilder/
│   │   ├── SortSelector/
│   │   └── index.ts
│   │
│   ├── analytics/                    # Analytics components
│   │   ├── Chart/
│   │   ├── MetricsCard/
│   │   ├── ActivityHeatmap/
│   │   ├── ProgressChart/
│   │   └── index.ts
│   │
│   └── index.ts                      # Component exports
│
├── hooks/                            # Custom hooks
│   ├── ui/
│   │   ├── useForm.ts
│   │   ├── useModal.ts
│   │   ├── useToast.ts
│   │   ├── useBreakpoint.ts
│   │   └── index.ts
│   │
│   ├── data/
│   │   ├── useFilters.ts
│   │   ├── usePagination.ts
│   │   ├── useSort.ts
│   │   ├── useSearch.ts
│   │   └── index.ts
│   │
│   ├── auth/
│   │   ├── useAuthGuard.ts
│   │   ├── usePermissions.ts
│   │   └── index.ts
│   │
│   └── index.ts                      # Hooks exports
│
├── context/                          # React contexts
│   ├── ThemeContext.tsx
│   ├── AuthContext.tsx
│   ├── NotificationContext.tsx
│   ├── OrganizationContext.tsx
│   ├── TranslationContext.tsx
│   ├── FilterContext.tsx
│   └── index.ts
│
├── features/                         # Feature modules
│   ├── authentication/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── dashboard/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.ts
│   │
│   ├── workout-planner/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.ts
│   │
│   ├── exercise-library/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.ts
│   │
│   ├── organization-management/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.ts
│   │
│   └── index.ts                      # Features exports
│
├── styles/                           # Global styles
│   ├── theme/
│   │   ├── ThemeManager.ts
│   │   ├── themes/
│   │   │   ├── DefaultTheme.ts
│   │   │   ├── EmeraldTheme.ts
│   │   │   └── index.ts
│   │   ├── ThemeRegistry.ts
│   │   ├── ThemeFactory.ts
│   │   ├── ThemeService.ts
│   │   └── index.ts
│   │
│   ├── global.css
│   ├── variables.css
│   ├── utils.css
│   └── index.ts
│
├── pages/                            # Page components
│   ├── Home.tsx
│   ├── Auth/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── ForgotPassword.tsx
│   │   └── ResetPassword.tsx
│   ├── Dashboard.tsx
│   ├── Exercise/
│   │   ├── ExerciseList.tsx
│   │   ├── ExerciseDetail.tsx
│   │   └── ExerciseCreate.tsx
│   ├── Workout/
│   │   ├── WorkoutList.tsx
│   │   ├── WorkoutDetail.tsx
│   │   └── WorkoutBuilder.tsx
│   ├── Program/
│   │   ├── ProgramList.tsx
│   │   ├── ProgramDetail.tsx
│   │   └── ProgramBuilder.tsx
│   ├── Organization/
│   │   ├── OrganizationList.tsx
│   │   ├── OrganizationDetail.tsx
│   │   └── OrganizationSettings.tsx
│   ├── Profile/
│   │   ├── ProfileView.tsx
│   │   ├── ProfileEdit.tsx
│   │   └── Settings.tsx
│   ├── Media/
│   │   ├── MediaLibrary.tsx
│   │   └── MediaUpload.tsx
│   ├── NotFound.tsx
│   └── index.ts
│
├── i18n/                             # Internationalization
│   ├── TranslationFacade.ts
│   ├── TranslationService.ts
│   ├── LocaleProvider.ts
│   ├── locales/
│   │   ├── en.json
│   │   ├── es.json
│   │   └── fr.json
│   ├── formatters/
│   │   ├── DateTimeFormatter.ts
│   │   └── NumberFormatter.ts
│   └── index.ts
│
├── utils/                            # Utilities
│   ├── validation.ts
│   ├── date.ts
│   ├── formatting.ts
│   ├── storage.ts
│   ├── url.ts
│   ├── array.ts
│   ├── object.ts
│   └── index.ts
│
├── types/                            # TypeScript types
│   ├── api.ts
│   ├── auth.ts
│   ├── user.ts
│   ├── exercise.ts
│   ├── workout.ts
│   ├── program.ts
│   ├── organization.ts
│   ├── media.ts
│   └── index.ts
│
├── constants/                        # Constants
│   ├── routes.ts
│   ├── api.ts
│   ├── permissions.ts
│   ├── exercise.ts
│   ├── workout.ts
│   ├── program.ts
│   └── index.ts
│
├── config/                           # Configuration
│   ├── config.ts
│   ├── environment.ts
│   ├── api.config.ts
│   ├── auth.config.ts
│   ├── i18n.config.ts
│   └── index.ts
│
├── App.tsx                           # Main app component
└── index.tsx                         # Application entry point
```

## Development Environment

```
motriforge/
│
├── .github/                          # GitHub configuration
│   └── workflows/                    # GitHub Actions workflows
│       ├── backend-ci.yml
│       ├── frontend-ci.yml
│       └── deploy.yml
│
├── scripts/                          # Development scripts
│   ├── setup.sh
│   ├── dev.sh
│   ├── build.sh
│   ├── test.sh
│   └── deploy.sh
│
├── docker/                           # Docker configuration
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   ├── backend.Dockerfile
│   └── frontend.Dockerfile
│
├── docs/                             # Documentation
│   ├── 01-architecture-overview/
│   ├── 02-core-systems/
│   ├── 03-api-layer/
│   └── ... (as per documentation structure)
│
├── .env.example                      # Environment variables example
├── .gitignore                        # Git ignore file
├── package.json                      # Root package.json for workspaces
├── tsconfig.json                     # TypeScript configuration
├── jest.config.js                    # Jest configuration
├── eslintrc.js                       # ESLint configuration
├── prettier.config.js                # Prettier configuration
└── README.md                         # Project readme
```

This directory structure follows best practices for modern frontend and backend development, with clear separation of concerns, feature-based organization, and modular architecture that matches the design diagrams.

The structure is designed to be:

1. **Scalable**: Easily accommodates new features and components
2. **Maintainable**: Clear organization makes code easier to maintain
3. **Modular**: Components and services are encapsulated and reusable
4. **Testable**: Structure facilitates unit and integration testing
5. **Consistent**: Follows a uniform pattern throughout the codebase

Key architectural patterns reflected in this structure include:

- Repository Pattern
- Facade Pattern
- Service Layer Pattern
- Strategy Pattern
- Event Mediator Pattern
- Factory Pattern
- Dependency Injection
- Feature-based Frontend Organization

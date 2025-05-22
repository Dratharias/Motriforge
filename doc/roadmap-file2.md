# Roadmap d'Implémentation - Partie 2 : Infrastructure et Services Core

## Infrastructure Backend (suite)

### 8. Infrastructure - Système d'Événements
- [x] `EventFacade` (`src/core/events/EventFacade.ts`) [B] `event-system-diagram`
- [x] `EventMediator` (`src/core/events/EventMediator.ts`) [B] `event-system-diagram` 
- [x] `EventPublisher` (`src/core/events/EventPublisher.ts`) [B] `event-system-diagram`
- [x] `EventQueue` (`src/core/events/EventQueue.ts`) [B] `event-system-diagram`
- [x] `EventSubscriber` (`src/core/events/EventSubscriber.ts`) [B] `event-system-diagram`
- [x] `EventBus` (`src/core/events/EventBus.ts`) [B] `event-system-diagram`
- [x] `EventHandler` (`src/core/events/EventHandler.ts`) [B] `event-system-diagram`
- [x] `EventRegistry` (`src/core/events/EventRegistry.ts`) [B] `event-system-diagram`
- [x] `EventContextProvider` (`src/core/events/EventContextProvider.ts`) [B] `event-system-diagram`
- [x] `EventEnricher` (`src/core/events/EventEnricher.ts`) [B] `event-system-diagram`
- [x] `DistributedEventPublisher` (`src/core/events/publishers/DistributedEventPublisher.ts`) [B] `event-system-diagram`
- [x] `Event` (`src/core/events/models/Event.ts`) [B] `event-system-diagram`
- [x] `EventSchema` (`src/core/events/EventSchema.ts`) [B] `event-system-diagram`
- [x] `Subscription` (`src/core/events/Subscription.ts`) [B] `event-system-diagram`
- [x] `DomainEvent<T>` (`src/core/events/models/DomainEvent.ts`) [B] `event-system-diagram`
- [x] `UserEvent` (`src/core/events/models/UserEvent.ts`) [B] `event-system-diagram`
- [x] `AuthEvent` (`src/core/events/models/AuthEvent.ts`) [B] `event-system-diagram`
- [x] `SystemEvent` (`src/core/events/models/SystemEvent.ts`) [B] `event-system-diagram`
- [x] `AuthEventHandler` (`src/core/events/handlers/AuthEventHandler.ts`) [B] `event-system-diagram`
- [x] `CacheInvalidationHandler` (`src/core/events/handlers/CacheInvalidationHandler.ts`) [B] `event-system-diagram`
- [x] `AuditEventHandler` (`src/core/events/handlers/AuditEventHandler.ts`) [B] `event-system-diagram`
- [x] `EventMetrics` (`src/core/events/EventMetrics.ts`) [B] `event-system-diagram`
- [x] `ProgressionEvents` (`src/core/events/types/ProgressionEvents.ts`) [B] `progression-tracking-system`
- [x] `TrainerClientEvents` (`src/core/events/types/TrainerClientEvents.ts`) [B] `trainer-client-system`

### 9. Infrastructure - Mise en Cache
- [x] `CacheFacade` (`src/core/cache/CacheFacade.ts`) [B] `cache-system`
- [x] `CacheManager` (`src/core/cache/CacheManager.ts`) [B] `cache-system`
- [x] `CacheEventMediator` (`src/core/cache/CacheEventMediator.ts`) [B] `cache-system`
- [x] `MemoryCacheAdapter` (`src/core/cache/adapters/MemoryCacheAdapter.ts`) [B] `cache-system`
- [x] `LocalStorageCacheAdapter` (`src/core/cache/adapters/LocalStorageCacheAdapter.ts`) [B] `cache-system`
- [x] `CacheStrategyFactory` (`src/core/cache/CacheStrategyFactory.ts`) [B] `cache-system`
- [x] `CacheFetchStrategy` (`src/core/cache/strategies/CacheFetchStrategy.ts`) [B] `cache-system`
- [x] `CacheStaleWhileRevalidateStrategy` (`src/core/cache/strategies/CacheStaleWhileRevalidateStrategy.ts`) [B] `cache-system`
- [x] `CacheInvalidationHandler` (`src/core/cache/CacheInvalidationHandler.ts`) [B] `cache-system`
- [x] `InvalidationPattern` (`src/core/cache/InvalidationPattern.ts`) [B] `cache-system`
- [x] `CacheHealthMonitor` (`src/core/cache/CacheHealthMonitor.ts`) [B] `cache-system`
- [x] `CacheEntry` (`src/core/cache/CacheEntry.ts`) [B] `cache-system`
- [x] `CacheOptions` (`src/core/cache/CacheOptions.ts`) [B] `cache-system`
- [x] `CacheStats` (`src/core/cache/CacheStats.ts`) [B] `cache-system`
- [x] `CachePolicy` (`src/core/cache/CachePolicy.ts`) [B] `cache-system`
- [x] `CacheHealthStatus` (`src/core/cache/CacheHealthStatus.ts`) [B] `cache-system`
- [x] `AuthCacheFacade` (`src/core/cache/AuthCacheFacade.ts`) [B] `cache-system`
- [x] `UserCacheFacade` (`src/core/cache/UserCacheFacade.ts`) [B] `cache-system`
- [x] `PermissionCacheFacade` (`src/core/cache/PermissionCacheFacade.ts`) [B] `cache-system`
- [x] `OrganizationCacheFacade` (`src/core/cache/OrganizationCacheFacade.ts`) [B] `cache-system`
- [x] `ApiCacheFacade` (`src/core/cache/ApiCacheFacade.ts`) [B] `cache-system`
- [x] `CacheEventTypes` (`src/core/cache/CacheEventTypes.ts`) [B] `cache-system`
- [x] `CacheDomain` (`src/core/cache/CacheDomain.ts`) [B] `cache-system`

### 10. Dépôts Core
- [x] `BaseRepository<T>` (`src/data/repositories/BaseRepository.ts`) [B] `repository-layer`
- [x] `UserRepository` (`src/data/repositories/UserRepository.ts`) [B] `repository-layer`
- [x] `OrganizationRepository` (`src/data/repositories/OrganizationRepository.ts`) [B] `repository-layer`
- [ ] `TokenRepository` (`src/data/repositories/TokenRepository.ts`) [B] `repository-layer`
- [ ] `PermissionRepository` (`src/data/repositories/PermissionRepository.ts`) [B] `repository-layer`
- [ ] `MediaRepository` (`src/data/repositories/MediaRepository.ts`) [B] `repository-layer`
- [ ] `ExerciseRepository` (`src/data/repositories/ExerciseRepository.ts`) [B] `repository-layer`
- [ ] `WorkoutRepository` (`src/data/repositories/WorkoutRepository.ts`) [B] `repository-layer`
- [ ] `ProgramRepository` (`src/data/repositories/ProgramRepository.ts`) [B] `repository-layer`
- [ ] `ActivityRepository` (`src/data/repositories/ActivityRepository.ts`) [B] `repository-layer`
- [ ] `FavoriteRepository` (`src/data/repositories/FavoriteRepository.ts`) [B] `repository-layer`
- [ ] `AnalyticsRepository` (`src/data/repositories/AnalyticsRepository.ts`) [B] `repository-layer`
- [ ] `NotificationRepository` (`src/data/repositories/NotificationRepository.ts`) [B] `repository-layer`
- [ ] `SearchRepository` (`src/data/repositories/SearchRepository.ts`) [B] `repository-layer`
- [ ] `PushTokenRepository` (`src/data/repositories/PushTokenRepository.ts`) [B] `repository-layer`
- [ ] `ProgressionRepository` (`src/data/repositories/ProgressionRepository.ts`) [B] `progression-tracking-system`
- [ ] `PersonalRecordRepository` (`src/data/repositories/PersonalRecordRepository.ts`) [B] `progression-tracking-system`
- [ ] `GoalRepository` (`src/data/repositories/GoalRepository.ts`) [B] `progression-tracking-system`
- [ ] `TrainerProfileRepository` (`src/data/repositories/TrainerProfileRepository.ts`) [B] `trainer-client-system`
- [ ] `ClientCoachRelationshipRepository` (`src/data/repositories/ClientCoachRelationshipRepository.ts`) [B] `trainer-client-system`
- [ ] `CoachingSessionRepository` (`src/data/repositories/CoachingSessionRepository.ts`) [B] `trainer-client-system`
- [ ] `ProgramAssignmentRepository` (`src/data/repositories/ProgramAssignmentRepository.ts`) [B] `trainer-client-system`
- [ ] `TrainingFeedbackRepository` (`src/data/repositories/TrainingFeedbackRepository.ts`) [B] `trainer-client-system`

### 11. Services Core
- [ ] `AuthService` (`src/domain/services/AuthService.ts`) [B] `auth-facade-diagram`
- [ ] `TokenService` (`src/domain/services/TokenService.ts`) [B] `auth-facade-diagram`
- [ ] `UserService` (`src/domain/services/UserService.ts`) [B] `service-layer-diagram`
- [ ] `MFAService` (`src/domain/services/MFAService.ts`) [B] `auth-facade-diagram`
- [ ] `PermissionService` (`src/domain/services/PermissionService.ts`) [B] `permission-system-diagram`
- [ ] `OrganizationService` (`src/domain/services/OrganizationService.ts`) [B] `organization-facade-diagram`
- [ ] `MembershipService` (`src/domain/services/MembershipService.ts`) [B] `organization-facade-diagram`
- [ ] `RoleService` (`src/domain/services/RoleService.ts`) [B] `permission-facade-diagram`
- [ ] `InvitationService` (`src/domain/services/InvitationService.ts`) [B] `organization-facade-diagram`
- [ ] `ResourcePermissions` (`src/domain/services/ResourcePermissions.ts`) [B] `permission-facade-diagram`
- [ ] `OfflineSyncService` (`src/domain/services/OfflineSyncService.ts`) [B] `service-layer-diagram`

## Services de Domaine Backend

### 12. Services de Domaine
- [ ] `ExerciseService` (`src/domain/services/ExerciseService.ts`) [B] `service-layer-diagram`
- [ ] `WorkoutService` (`src/domain/services/WorkoutService.ts`) [B] `service-layer-diagram`
- [ ] `ProgramService` (`src/domain/services/ProgramService.ts`) [B] `service-layer-diagram`
- [ ] `ActivityService` (`src/domain/services/ActivityService.ts`) [B] `service-layer-diagram`
- [ ] `FavoriteService` (`src/domain/services/FavoriteService.ts`) [B] `service-layer-diagram`
- [ ] `MediaService` (`src/domain/services/MediaService.ts`) [B] `service-layer-diagram`
- [ ] `StorageService` (`src/domain/services/StorageService.ts`) [B] `file-media-system-diagram`
- [ ] `MetadataExtractor` (`src/domain/media/MetadataExtractor.ts`) [B] `file-media-system-diagram`
- [ ] `ThumbnailGenerator` (`src/domain/media/ThumbnailGenerator.ts`) [B] `file-media-system-diagram`
- [ ] `MediaQueue` (`src/domain/media/MediaQueue.ts`) [B] `file-media-system-diagram`
- [ ] `ProcessingManager` (`src/domain/media/ProcessingManager.ts`) [B] `file-media-system-diagram`
- [ ] `ImageProcessor` (`src/domain/media/processors/ImageProcessor.ts`) [B] `file-media-system-diagram`
- [ ] `VideoProcessor` (`src/domain/media/processors/VideoProcessor.ts`) [B] `file-media-system-diagram`
- [ ] `UserStorageManager` (`src/domain/media/UserStorageManager.ts`) [B] `file-media-system-diagram`
- [ ] `ImageOptimizationService` (`src/domain/media/ImageOptimizationService.ts`) [B] `file-media-system-diagram`
- [ ] `ProgressionService` (`src/domain/services/ProgressionService.ts`) [B] `progression-tracking-system`
- [ ] `ProgressionAnalysisService` (`src/domain/services/ProgressionAnalysisService.ts`) [B] `progression-tracking-system`
- [ ] `GoalTrackingService` (`src/domain/services/GoalTrackingService.ts`) [B] `progression-tracking-system`
- [ ] `TrainerService` (`src/domain/services/TrainerService.ts`) [B] `trainer-client-system`
- [ ] `ClientCoachService` (`src/domain/services/ClientCoachService.ts`) [B] `trainer-client-system`
- [ ] `CoachingSessionService` (`src/domain/services/CoachingSessionService.ts`) [B] `trainer-client-system`
- [ ] `ProgramAssignmentService` (`src/domain/services/ProgramAssignmentService.ts`) [B] `trainer-client-system`
- [ ] `TrainingFeedbackService` (`src/domain/services/TrainingFeedbackService.ts`) [B] `trainer-client-system`
- [ ] `TrainerAnalyticsService` (`src/domain/services/TrainerAnalyticsService.ts`) [B] `trainer-client-system`

### 13. Système de Notification
- [ ] `NotificationService` (`src/domain/notification/NotificationService.ts`) [B] `notification-system-diagram`
- [ ] `NotificationChannelManager` (`src/domain/notification/NotificationChannelManager.ts`) [B] `notification-system-diagram`
- [ ] `EmailNotificationSender` (`src/domain/notification/senders/EmailNotificationSender.ts`) [B] `notification-system-diagram`
- [ ] `PushNotificationSender` (`src/domain/notification/senders/PushNotificationSender.ts`) [B] `notification-system-diagram`
- [ ] `InAppNotificationSender` (`src/domain/notification/senders/InAppNotificationSender.ts`) [B] `notification-system-diagram`
- [ ] `SMSNotificationSender` (`src/domain/notification/senders/SMSNotificationSender.ts`) [B] `notification-system-diagram`
- [ ] `NotificationTemplateService` (`src/domain/notification/NotificationTemplateService.ts`) [B] `notification-system-diagram`
- [ ] `PushService` (`src/domain/notification/PushService.ts`) [B] `notification-system-diagram`
- [ ] `EmailService` (`src/domain/notification/EmailService.ts`) [B] `notification-system-diagram`
- [ ] `SMSService` (`src/domain/notification/SMSService.ts`) [B] `notification-system-diagram`
- [ ] `NotificationEventHandler` (`src/domain/notification/NotificationEventHandler.ts`) [B] `notification-system-diagram`

### 14. Recherche & Analytics
- [ ] `SearchService` (`src/domain/search/SearchService.ts`) [B] `search-system-diagram`
- [ ] `SearchEngine` (`src/domain/search/SearchEngine.ts`) [B] `search-system-diagram`
- [ ] `ElasticsearchEngine` (`src/domain/search/engines/ElasticsearchEngine.ts`) [B] `search-system-diagram`
- [ ] `InMemorySearchEngine` (`src/domain/search/engines/InMemorySearchEngine.ts`) [B] `search-system-diagram`
- [ ] `IndexManager` (`src/domain/search/IndexManager.ts`) [B] `search-system-diagram`
- [ ] `ExerciseIndexBuilder` (`src/domain/search/builders/ExerciseIndexBuilder.ts`) [B] `search-system-diagram`
- [ ] `WorkoutIndexBuilder` (`src/domain/search/builders/WorkoutIndexBuilder.ts`) [B] `search-system-diagram`
- [ ] `SearchEventHandler` (`src/domain/search/SearchEventHandler.ts`) [B] `search-system-diagram`
- [ ] `TextAnalyzer` (`src/domain/search/TextAnalyzer.ts`) [B] `search-system-diagram`
- [ ] `IndexScheduler` (`src/domain/search/IndexScheduler.ts`) [B] `search-system-diagram`
- [ ] `AnalyticsService` (`src/domain/analytics/AnalyticsService.ts`) [B] `analytics-metrics-diagram`
- [ ] `MetricsCollector` (`src/domain/analytics/MetricsCollector.ts`) [B] `analytics-metrics-diagram`
- [ ] `ReportGenerator` (`src/domain/analytics/ReportGenerator.ts`) [B] `analytics-metrics-diagram`
- [ ] `DashboardService` (`src/domain/analytics/DashboardService.ts`) [B] `analytics-metrics-diagram`
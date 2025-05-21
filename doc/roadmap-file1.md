# Roadmap d'Implémentation - Partie 1 : Modèles de Base et Infrastructure

## Modèles de Domaine Partagés (Frontend & Backend)

### 1. Modèles de Domaine de Base
- [x] `User` (`src/data/models/User/User.ts`) [B/F] `domain-model-diagram`
- [x] `Organization` (`src/data/models/Organization/Organization.ts`) [B/F] `domain-model-diagram`
- [x] `OrganizationMember` (`src/data/models/Organization/OrganizationMember.ts`) [B/F] `domain-model-diagram`
- [x] `Invitation` (`src/data/models/Organization/Invitation.ts`) [B/F] `domain-model-diagram`
- [x] `Exercise` (`src/data/models/Exercise/Exercise.ts`) [B/F] `domain-model-diagram`
- [x] `ExerciseProgression` (`src/data/models/Exercise/ExerciseProgression.ts`) [B/F] `domain-model-diagram`
- [x] `ExerciseAlternative` (`src/data/models/Exercise/ExerciseAlternative.ts`) [B/F] `domain-model-diagram`
- [x] `ExerciseMetric` (`src/data/models/Exercise/ExerciseMetric.ts`) [B/F] `domain-model-diagram`
- [x] `Workout` (`src/data/models/Workout/Workout.ts`) [B/F] `domain-model-diagram`
- [x] `WorkoutBlock` (`src/data/models/Workout/WorkoutBlock.ts`) [B/F] `domain-model-diagram`
- [x] `WorkoutExercise` (`src/data/models/Workout/WorkoutExercise.ts`) [B/F] `domain-model-diagram`
- [x] `Program` (`src/data/models/Program.ts`) [B/F] `domain-model-diagram`
- [x] `ProgramScheduleItem` (`src/data/models/ProgramScheduleItem.ts`) [B/F] `domain-model-diagram`
- [x] `Activity` (`src/data/models/User/Activity.ts`) [B/F] `domain-model-diagram`
- [x] `ActivityEntry` (`src/data/models/User/ActivityEntry.ts`) [B/F] `domain-model-diagram`
- [x] `Favorite` (`src/data/models/User/Favorite.ts`) [B/F] `domain-model-diagram`
- [x] `ExerciseSwap` (`src/data/models/Exercise/ExerciseSwap.ts`) [B/F] `domain-model-diagram`
- [x] `Media` (`src/data/models/Media.ts`) [B/F] `domain-model-diagram`
- [x] `MediaVariant` (`src/data/models/MediaVariant.ts`) [B/F] `domain-model-diagram`
- [x] `Equipment` (`src/data/models/Equipment.ts`) [B/F] `domain-model-diagram`
- [x] `RefreshToken` (`src/data/models/User/RefreshToken.ts`) [B/F] `domain-model-diagram`
- [x] `Role` (`src/data/models/User/Role.ts`) [B/F] `domain-model-diagram`

### 2. Modèles de Progression et Coaching
- [x] `ProgressionTracking` (`src/data/models/progression/ProgressionTracking.ts`) [B/F] `progression-tracking-system`
- [x] `DailyPerformance` (`src/data/models/progression/DailyPerformance.ts`) [B/F] `progression-tracking-system`
- [x] `PersonalRecord` (`src/data/models/progression/PersonalRecord.ts`) [B/F] `progression-tracking-system`
- [x] `GoalTracking` (`src/data/models/progression/GoalTracking.ts`) [B/F] `progression-tracking-system`
- [x] `Milestone` (`src/data/models/progression/Milestone.ts`) [B/F] `progression-tracking-system`
- [x] `WorkoutSession` (`src/data/models/progression/WorkoutSession.ts`) [B/F] `progression-tracking-system`
- [x] `WorkoutSessionExercise` (`src/data/models/progression/WorkoutSessionExercise.ts`) [B/F] `progression-tracking-system`
- [x] `SetData` (`src/data/models/progression/SetData.ts`) [B/F] `progression-tracking-system`

### 3. Modèles Formateur-Client
- [x] `TrainerProfile` (`src/data/models/trainer/TrainerProfile.ts`) [B/F] `trainer-client-system`
- [x] `Certificate` (`src/data/models/trainer/Certificate.ts`) [B/F] `trainer-client-system`
- [x] `ClientCoachRelationship` (`src/data/models/trainer/ClientCoachRelationship.ts`) [B/F] `trainer-client-system`
- [x] `PermissionSet` (`src/data/models/trainer/PermissionSet.ts`) [B/F] `trainer-client-system`
- [x] `ProgramAssignment` (`src/data/models/trainer/ProgramAssignment.ts`) [B/F] `trainer-client-system`
- [x] `ProgramModification` (`src/data/models/trainer/ProgramModification.ts`) [B/F] `trainer-client-system`
- [x] `TrainingFeedback` (`src/data/models/trainer/TrainingFeedback.ts`) [B/F] `trainer-client-system`
- [x] `CoachingSession` (`src/data/models/trainer/CoachingSession.ts`) [B/F] `trainer-client-system`
- [x] `MediaNote` (`src/data/models/trainer/MediaNote.ts`) [B/F] `trainer-client-system`
- [x] `TrainerDashboard` (`src/data/models/trainer/TrainerDashboard.ts`) [B/F] `trainer-client-system`
- [x] `ClientAlert` (`src/data/models/trainer/ClientAlert.ts`) [B/F] `trainer-client-system`

### 4. Modèles Muscle et Anatomie
- [x] `Muscle` (`src/data/models/Muscle.ts`) [B/F]
- [x] `MuscleGroup` (`src/data/models/MuscleGroup.ts`) [B/F]

### 5. Modèles Enum
- [x] `DifficultyLevel` (`src/data/models/enums/DifficultyLevel.ts`) [B/F]
- [x] `ExerciseType` (`src/data/models/enums/ExerciseType.ts`) [B/F]
- [x] `IntensityLevel` (`src/data/models/enums/IntensityLevel.ts`) [B/F]
- [x] `WorkoutGoal` (`src/data/models/enums/WorkoutGoal.ts`) [B/F]
- [x] `OrganizationType` (`src/data/models/enums/OrganizationType.ts`) [B/F]
- [x] `OrganizationVisibility` (`src/data/models/enums/OrganizationVisibility.ts`) [B/F]
- [x] `TrustLevel` (`src/data/models/enums/TrustLevel.ts`) [B/F]
- [x] `OrganizationRole` (`src/data/models/enums/OrganizationRole.ts`) [B/F]
- [x] `BlockType` (`src/data/models/enums/BlockType.ts`) [B/F]
- [x] `MediaType` (`src/data/models/enums/MediaType.ts`) [B/F]
- [x] `MediaCategory` (`src/data/models/enums/MediaCategory.ts`) [B/F]
- [x] `MetricType` (`src/data/models/enums/MetricType.ts`) [B/F]
- [x] `TimeResolution` (`src/data/models/enums/TimeResolution.ts`) [B/F]
- [x] `GoalStatus` (`src/data/models/enums/GoalStatus.ts`) [B/F]
- [x] `RelationshipStatus` (`src/data/models/enums/RelationshipStatus.ts`) [B/F]
- [x] `ActivityAction` (`src/data/models/enums/ActivityAction.ts`) [B/F]
- [x] `MuscleType` (`src/data/models/enums/MuscleType.ts`) [B/F]
- [x] `MuscleZone` (`src/data/models/enums/MuscleZone.ts`) [B/F]
- [x] `MuscleLevel` (`src/data/models/enums/MuscleLevel.ts`) [B/F]

### 6. Objets Valeur & DTOs
- [x] `SearchableDocument` (`src/data/dto/search/SearchableDocument.ts`) [B/F] `search-system-diagram`
- [x] `FilterCriteria` (`src/data/filtering/FilterCriteria.ts`) [B/F] `filtering-architecture-diagram`
- [x] `SortOptions` (`src/data/filtering/SortOptions.ts`) [B/F] `filtering-architecture-diagram`
- [x] `PaginationOptions` (`src/data/filtering/PaginationOptions.ts`) [B/F] `filtering-architecture-diagram`
- [x] `PaginationResult` (`src/data/filtering/PaginationResult.ts`) [B/F] `filtering-architecture-diagram`
- [x] `HighlightOptions` (`src/data/dto/search/HighlightOptions.ts`) [B/F] `search-system-diagram`
- [x] `Highlight` (`src/data/dto/search/Highlight.ts`) [B/F] `search-system-diagram`
- [x] `ValidationResult` (`src/utils/validation.ts`) [B/F] `error-handling-system-diagram`
- [x] `RequestContext` (`src/api/middleware/RequestContext.ts`) [B/F] `middleware-pipeline-diagram`
- [x] `EventContext` (`src/core/events/EventContext.ts`) [B/F] `event-system-diagram`
- [x] `PermissionContext` (`src/core/permission/PermissionContext.ts`) [B/F] `permission-system-diagram`
- [x] `ErrorContext` (`src/core/error/ErrorContext.ts`) [B/F] `error-handling-system-diagram`
- [x] `FilterOptions` (`src/data/filtering/FilterOptions.ts`) [B/F] `filtering-architecture-diagram`
- [x] `SearchOptions` (`src/data/dto/search/SearchOptions.ts`) [B/F] `search-system-diagram`
- [x] `SearchResults` (`src/data/dto/search/SearchResults.ts`) [B/F] `search-system-diagram`
- [x] `SearchResult` (`src/data/dto/search/SearchResult.ts`) [B/F] `search-system-diagram`

## Infrastructure Backend

### 5. Infrastructure - Base de Données & Stockage
- [x] `Database` (`src/data/database/Database.ts`) [B] `repository-layer`
- [x] `Collection` (`src/data/database/Collection.ts`) [B] `repository-layer`
- [x] `QueryBuilder<T>` (`src/data/database/QueryBuilder.ts`) [B] `repository-layer`
- [x] `TransactionManager` (`src/data/database/TransactionManager.ts`) [B] `repository-layer`
- [x] `Transaction` (`src/data/database/Transaction.ts`) [B] `repository-layer`
- [x] `TransactionOperation` (`src/data/database/TransactionOperation.ts`) [B] `repository-layer`
- [x] `StorageProvider` (`src/domain/media/StorageProvider.ts`) [B] `file-media-system-diagram`
- [x] `CloudflareR2Provider` (`src/domain/media/providers/CloudflareR2Provider.ts`) [B] `file-media-system-diagram`
- [x] `LocalFileSystemProvider` (`src/domain/media/providers/LocalFileSystemProvider.ts`) [B] `file-media-system-diagram`

### 6. Infrastructure - Journalisation
- [ ] `LoggerFacade` (`src/core/logging/LoggerFacade.ts`) [B] `logging-system-diagram`
- [ ] `LoggerService` (`src/core/logging/LoggerService.ts`) [B] `logging-system-diagram`
- [ ] `LogProvider` (`src/core/logging/LogProvider.ts`) [B] `logging-system-diagram`
- [ ] `LogTransport` (`src/core/logging/LogTransport.ts`) [B] `logging-system-diagram`
- [ ] `ConsoleTransport` (`src/core/logging/transports/ConsoleTransport.ts`) [B] `logging-system-diagram`
- [ ] `FileTransport` (`src/core/logging/transports/FileTransport.ts`) [B] `logging-system-diagram`
- [ ] `CloudTransport` (`src/core/logging/transports/CloudTransport.ts`) [B] `logging-system-diagram`
- [ ] `JsonFormatter` (`src/core/logging/formatters/JsonFormatter.ts`) [B] `logging-system-diagram`
- [ ] `SimpleFormatter` (`src/core/logging/formatters/SimpleFormatter.ts`) [B] `logging-system-diagram`
- [ ] `LogContextManager` (`src/core/logging/LogContextManager.ts`) [B] `logging-system-diagram`
- [ ] `LogMetrics` (`src/core/logging/LogMetrics.ts`) [B] `logging-system-diagram`
- [ ] `LogMiddleware` (`src/core/logging/LogMiddleware.ts`) [B] `logging-system-diagram`
- [ ] `RequestLogEnricher` (`src/core/logging/RequestLogEnricher.ts`) [B] `logging-system-diagram`
- [ ] `LogEntry` (`src/core/logging/LogEntry.ts`) [B] `logging-system-diagram`
- [ ] `LogContext` (`src/core/logging/LogContext.ts`) [B] `logging-system-diagram`
- [ ] `ErrorInfo` (`src/core/error/ErrorInfo.ts`) [B] `error-handling-system-diagram`

### 7. Infrastructure - Gestion des Erreurs
- [ ] `ErrorHandlingFacade` (`src/core/error/ErrorHandlingFacade.ts`) [B] `error-handling-system-diagram`
- [ ] `ErrorHandlerRegistry` (`src/core/error/ErrorHandlerRegistry.ts`) [B] `error-handling-system-diagram`
- [ ] `ErrorMapperRegistry` (`src/core/error/ErrorMapperRegistry.ts`) [B] `error-handling-system-diagram`
- [ ] `ErrorFormatterRegistry` (`src/core/error/ErrorFormatterRegistry.ts`) [B] `error-handling-system-diagram`
- [ ] `ValidationErrorHandler` (`src/core/error/handlers/ValidationErrorHandler.ts`) [B] `error-handling-system-diagram`
- [ ] `DatabaseErrorHandler` (`src/core/error/handlers/DatabaseErrorHandler.ts`) [B] `error-handling-system-diagram`
- [ ] `AuthErrorHandler` (`src/core/error/handlers/AuthErrorHandler.ts`) [B] `error-handling-system-diagram`
- [ ] `HttpErrorMapper` (`src/core/error/mappers/HttpErrorMapper.ts`) [B] `error-handling-system-diagram`
- [ ] `JsonErrorFormatter` (`src/core/error/formatters/JsonErrorFormatter.ts`) [B] `error-handling-system-diagram`
- [ ] `HtmlErrorFormatter` (`src/core/error/formatters/HtmlErrorFormatter.ts`) [B] `error-handling-system-diagram`
- [ ] `ErrorMiddleware` (`src/core/error/ErrorMiddleware.ts`) [B] `error-handling-system-diagram`
- [ ] `ErrorBoundary` (`src/core/error/ErrorBoundary.ts`) [B] `error-handling-system-diagram`
- [ ] `GlobalErrorHandler` (`src/core/error/GlobalErrorHandler.ts`) [B] `error-handling-system-diagram`
- [ ] `ErrorLoggerService` (`src/core/error/ErrorLoggerService.ts`) [B] `error-handling-system-diagram`
- [ ] `ErrorFactory` (`src/core/error/ErrorFactory.ts`) [B] `error-handling-system-diagram`
- [ ] `ApplicationError` (`src/core/error/exceptions/ApplicationError.ts`) [B] `error-handling-system-diagram`
- [ ] `ValidationError` (`src/core/error/exceptions/ValidationError.ts`) [B] `error-handling-system-diagram`
- [ ] `AuthError` (`src/core/error/exceptions/AuthError.ts`) [B] `error-handling-system-diagram`
- [ ] `DatabaseError` (`src/core/error/exceptions/DatabaseError.ts`) [B] `error-handling-system-diagram`
- [ ] `ApiError` (`src/core/error/ApiError.ts`) [B] `error-handling-system-diagram`
- [ ] `ErrorResult` (`src/core/error/ErrorResult.ts`) [B] `error-handling-system-diagram`
- [ ] `FormattedError` (`src/core/error/FormattedError.ts`) [B] `error-handling-system-diagram`
- [ ] `ErrorMetrics` (`src/core/error/ErrorMetrics.ts`) [B] `error-handling-system-diagram`
# Roadmap d'Implémentation - Partie 1 : Modèles de Base et Infrastructure

## Modèles de Domaine Partagés (Frontend & Backend)

### 1. Modèles de Domaine de Base
- [ ] `User` (`src/data/models/User.ts`) [B/F] `domain-model-diagram`
- [ ] `Organization` (`src/data/models/Organization.ts`) [B/F] `domain-model-diagram`
- [ ] `OrganizationMember` (`src/data/models/OrganizationMember.ts`) [B/F] `domain-model-diagram`
- [ ] `Invitation` (`src/data/models/Invitation.ts`) [B/F] `domain-model-diagram`
- [ ] `Exercise` (`src/data/models/Exercise.ts`) [B/F] `domain-model-diagram`
- [ ] `ExerciseProgression` (`src/data/models/ExerciseProgression.ts`) [B/F] `domain-model-diagram`
- [ ] `ExerciseAlternative` (`src/data/models/ExerciseAlternative.ts`) [B/F] `domain-model-diagram`
- [ ] `ExerciseMetric` (`src/data/models/ExerciseMetric.ts`) [B/F] `domain-model-diagram`
- [ ] `Workout` (`src/data/models/Workout.ts`) [B/F] `domain-model-diagram`
- [ ] `WorkoutBlock` (`src/data/models/WorkoutBlock.ts`) [B/F] `domain-model-diagram`
- [ ] `WorkoutExercise` (`src/data/models/WorkoutExercise.ts`) [B/F] `domain-model-diagram`
- [ ] `Program` (`src/data/models/Program.ts`) [B/F] `domain-model-diagram`
- [ ] `ProgramScheduleItem` (`src/data/models/ProgramScheduleItem.ts`) [B/F] `domain-model-diagram`
- [ ] `Activity` (`src/data/models/Activity.ts`) [B/F] `domain-model-diagram`
- [ ] `ActivityEntry` (`src/data/models/ActivityEntry.ts`) [B/F] `domain-model-diagram`
- [ ] `Favorite` (`src/data/models/Favorite.ts`) [B/F] `domain-model-diagram`
- [ ] `ExerciseSwap` (`src/data/models/ExerciseSwap.ts`) [B/F] `domain-model-diagram`
- [ ] `Media` (`src/data/models/Media.ts`) [B/F] `domain-model-diagram`
- [ ] `MediaVariant` (`src/data/models/MediaVariant.ts`) [B/F] `domain-model-diagram`
- [ ] `Equipment` (`src/data/models/Equipment.ts`) [B/F] `domain-model-diagram`
- [ ] `RefreshToken` (`src/data/models/RefreshToken.ts`) [B/F] `domain-model-diagram`
- [ ] `Role` (`src/data/models/Role.ts`) [B/F] `domain-model-diagram`

### 2. Modèles de Progression et Coaching
- [ ] `ProgressionTracking` (`src/data/models/ProgressionTracking.ts`) [B/F] `progression-tracking-system`
- [ ] `DailyPerformance` (`src/data/models/DailyPerformance.ts`) [B/F] `progression-tracking-system`
- [ ] `PersonalRecord` (`src/data/models/PersonalRecord.ts`) [B/F] `progression-tracking-system`
- [ ] `GoalTracking` (`src/data/models/GoalTracking.ts`) [B/F] `progression-tracking-system`
- [ ] `Milestone` (`src/data/models/Milestone.ts`) [B/F] `progression-tracking-system`
- [ ] `WorkoutSession` (`src/data/models/WorkoutSession.ts`) [B/F] `progression-tracking-system`
- [ ] `WorkoutSessionExercise` (`src/data/models/WorkoutSessionExercise.ts`) [B/F] `progression-tracking-system`
- [ ] `SetData` (`src/data/models/SetData.ts`) [B/F] `progression-tracking-system`

### 3. Modèles Formateur-Client
- [ ] `TrainerProfile` (`src/data/models/TrainerProfile.ts`) [B/F] `trainer-client-system`
- [ ] `Certificate` (`src/data/models/Certificate.ts`) [B/F] `trainer-client-system`
- [ ] `ClientCoachRelationship` (`src/data/models/ClientCoachRelationship.ts`) [B/F] `trainer-client-system`
- [ ] `PermissionSet` (`src/data/models/PermissionSet.ts`) [B/F] `trainer-client-system`
- [ ] `ProgramAssignment` (`src/data/models/ProgramAssignment.ts`) [B/F] `trainer-client-system`
- [ ] `ProgramModification` (`src/data/models/ProgramModification.ts`) [B/F] `trainer-client-system`
- [ ] `TrainingFeedback` (`src/data/models/TrainingFeedback.ts`) [B/F] `trainer-client-system`
- [ ] `CoachingSession` (`src/data/models/CoachingSession.ts`) [B/F] `trainer-client-system`
- [ ] `MediaNote` (`src/data/models/MediaNote.ts`) [B/F] `trainer-client-system`
- [ ] `TrainerDashboard` (`src/data/models/TrainerDashboard.ts`) [B/F] `trainer-client-system`
- [ ] `ClientAlert` (`src/data/models/ClientAlert.ts`) [B/F] `trainer-client-system`

### 4. Objets Valeur & DTOs
- [ ] `SearchableDocument` (`src/data/dto/search/SearchableDocument.ts`) [B/F] `search-system-diagram`
- [ ] `FilterCriteria` (`src/data/filtering/FilterCriteria.ts`) [B/F] `filtering-architecture-diagram`
- [ ] `SortOptions` (`src/data/filtering/SortOptions.ts`) [B/F] `filtering-architecture-diagram`
- [ ] `PaginationOptions` (`src/data/filtering/PaginationOptions.ts`) [B/F] `filtering-architecture-diagram`
- [ ] `PaginationResult` (`src/data/filtering/PaginationResult.ts`) [B/F] `filtering-architecture-diagram`
- [ ] `HighlightOptions` (`src/data/dto/search/HighlightOptions.ts`) [B/F] `search-system-diagram`
- [ ] `Highlight` (`src/data/dto/search/Highlight.ts`) [B/F] `search-system-diagram`
- [ ] `ValidationResult` (`src/utils/validation.ts`) [B/F] `error-handling-system-diagram`
- [ ] `RequestContext` (`src/api/middleware/RequestContext.ts`) [B/F] `middleware-pipeline-diagram`
- [ ] `EventContext` (`src/core/events/EventContext.ts`) [B/F] `event-system-diagram`
- [ ] `PermissionContext` (`src/core/permission/PermissionContext.ts`) [B/F] `permission-system-diagram`
- [ ] `ErrorContext` (`src/core/error/ErrorContext.ts`) [B/F] `error-handling-system-diagram`
- [ ] `FilterOptions` (`src/data/filtering/FilterOptions.ts`) [B/F] `filtering-architecture-diagram`
- [ ] `SearchOptions` (`src/data/dto/search/SearchOptions.ts`) [B/F] `search-system-diagram`
- [ ] `SearchResults` (`src/data/dto/search/SearchResults.ts`) [B/F] `search-system-diagram`
- [ ] `SearchResult` (`src/data/dto/search/SearchResult.ts`) [B/F] `search-system-diagram`

## Infrastructure Backend

### 5. Infrastructure - Base de Données & Stockage
- [ ] `Database` (`src/data/database/Database.ts`) [B] `repository-layer`
- [ ] `Collection` (`src/data/database/Collection.ts`) [B] `repository-layer`
- [ ] `QueryBuilder<T>` (`src/data/database/QueryBuilder.ts`) [B] `repository-layer`
- [ ] `TransactionManager` (`src/data/database/TransactionManager.ts`) [B] `repository-layer`
- [ ] `Transaction` (`src/data/database/Transaction.ts`) [B] `repository-layer`
- [ ] `TransactionOperation` (`src/data/database/TransactionOperation.ts`) [B] `repository-layer`
- [ ] `StorageProvider` (`src/domain/media/StorageProvider.ts`) [B] `file-media-system-diagram`
- [ ] `CloudflareR2Provider` (`src/domain/media/providers/CloudflareR2Provider.ts`) [B] `file-media-system-diagram`
- [ ] `LocalFileSystemProvider` (`src/domain/media/providers/LocalFileSystemProvider.ts`) [B] `file-media-system-diagram`

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

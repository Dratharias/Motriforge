# Milestone 3: Core Business Logic (Weeks 6-10)

## Phase 5.1: Basic Exercise Domain (Week 6-7)
### Exercise Core Entity
- [x] Create `src/domain/exercise/entities/`
  - [x] Exercise entity (implement IEntity, ICloneable, IShareable, IDraftable, IValidatable)
  - [x] ExerciseInstruction entity
  - [x] ExerciseProgression entity
  - [x] IContraindication interface
  - [x] IDifficultyLevel interface

### Exercise Configuration
- [x] Create `src/domain/exercise/config/`
  - [x] IExerciseConfig interface
  - [x] ExerciseDefaults class
  - [x] ProgressionRules class
  - [x] SafetyGuidelines class

### Exercise Repository
- [x] Create `src/domain/exercise/repositories/`
  - [x] IExerciseRepository interface
  - [x] ExerciseQueryOptions interface
  - [x] ExerciseSearchCriteria interface

### Testing
- [x] Unit tests for Exercise entity
- [x] Unit tests for ExerciseInstruction
- [x] Unit tests for ExerciseProgression
- [x] Entity relationship tests
- [x] Draft/publish workflow tests

## Phase 5.2: Exercise Validation & Publishing (Week 7-8)
### Exercise Validation
- [ ] Create `src/domain/exercise/validation/`
  - [ ] IExerciseValidator interface
  - [ ] ExerciseValidatorFacade class
  - [ ] BasicInfoValidator class
  - [ ] InstructionValidator class
  - [ ] SafetyValidator class
  - [ ] MediaValidator class
  - [ ] ProgressionValidator class

### Exercise Publishing
- [ ] Create `src/domain/exercise/publishing/`
  - [ ] IPublishingRule interface
  - [ ] PublishingEngine class
  - [ ] ComplianceChecker class
  - [ ] PublicationApprover class

### Exercise Services (Facade Pattern)
- [ ] Create `src/domain/exercise/services/`
  - [ ] ExerciseServiceFacade class
  - [ ] ExerciseCreationService class
  - [ ] ExerciseUpdateService class
  - [ ] ExerciseCloneService class
  - [ ] ExercisePublishingService class
  - [ ] ExerciseCompatibilityService class

### Exercise Utilities
- [ ] Create `src/domain/exercise/utils/`
  - [ ] ExerciseBuilder class
  - [ ] ProgressionCalculator class
  - [ ] DifficultyAssessor class
  - [ ] AlternativesFinder class

### Testing
- [ ] Unit tests for all validators
- [ ] Integration tests for ExerciseServiceFacade
- [ ] Publishing workflow tests
- [ ] Validation rule combination tests
- [ ] Service orchestration tests

## Phase 6.1: Core Workout Structure (Week 8-9)
### Workout Core Entities
- [ ] Create `src/domain/workout/entities/`
  - [ ] Workout entity (implement IEntity, ICloneable, IShareable, IDraftable, IValidatable)
  - [ ] WorkoutExercise entity
  - [ ] ExerciseSet entity
  - [ ] WorkoutSection entity

### Workout Configuration
- [ ] Create `src/domain/workout/config/`
  - [ ] ISetConfig interface
  - [ ] IActualPerformance interface
  - [ ] WorkoutDefaults class
  - [ ] SetTypeRules class

### Workout Repository
- [ ] Create `src/domain/workout/repositories/`
  - [ ] IWorkoutRepository interface
  - [ ] WorkoutQueryOptions interface
  - [ ] WorkoutSearchCriteria interface

### Testing
- [ ] Unit tests for Workout entity
- [ ] Unit tests for WorkoutExercise
- [ ] Unit tests for ExerciseSet
- [ ] Workout composition tests
- [ ] Set progression tests

## Phase 6.2: Workout State Management (Week 9-10)
### Workout State Machine (Avoid Complex State Logic in Main Class)
- [ ] Create `src/domain/workout/state/`
  - [ ] IWorkoutState interface
  - [ ] WorkoutStateMachine class
  - [ ] DraftState class
  - [ ] ScheduledState class
  - [ ] InProgressState class
  - [ ] CompletedState class
  - [ ] PausedState class

### Workout State Handlers
- [ ] Create `src/domain/workout/state/handlers/`
  - [ ] IStateHandler interface
  - [ ] StartWorkoutHandler class
  - [ ] PauseWorkoutHandler class
  - [ ] ResumeWorkoutHandler class
  - [ ] CompleteWorkoutHandler class
  - [ ] CancelWorkoutHandler class

### Workout Progress Tracking
- [ ] Create `src/domain/workout/progress/`
  - [ ] WorkoutProgressTracker class
  - [ ] SetProgressTracker class
  - [ ] VolumeCalculator class
  - [ ] IntensityCalculator class

### Workout Services (Facade Pattern)
- [ ] Create `src/domain/workout/services/`
  - [ ] WorkoutServiceFacade class
  - [ ] WorkoutCreationService class
  - [ ] WorkoutExecutionService class
  - [ ] WorkoutAnalysisService class
  - [ ] WorkoutTemplateService class

### Workout Validation
- [ ] Create `src/domain/workout/validation/`
  - [ ] IWorkoutValidator interface
  - [ ] WorkoutValidatorFacade class
  - [ ] ExerciseOrderValidator class
  - [ ] RestTimeValidator class
  - [ ] VolumeValidator class
  - [ ] DurationValidator class

### Testing
- [ ] Unit tests for state machine
- [ ] Unit tests for state handlers
- [ ] Integration tests for WorkoutServiceFacade
- [ ] State transition tests
- [ ] Progress tracking tests
- [ ] Workout validation tests

## Phase 6.3: Workout-Exercise Integration (Week 10)
### Integration Services
- [ ] Create `src/domain/workout/integration/`
  - [ ] ExerciseIntegrationService class
  - [ ] AlternativeExerciseService class
  - [ ] ProgressionSuggestionService class
  - [ ] LoadCalculationService class

### Workout Builder
- [ ] Create `src/domain/workout/builders/`
  - [ ] WorkoutBuilder class
  - [ ] WorkoutFromTemplateBuilder class
  - [ ] CustomWorkoutBuilder class
  - [ ] WorkoutModificationBuilder class

### Workout Analytics
- [ ] Create `src/domain/workout/analytics/`
  - [ ] WorkoutAnalytics class
  - [ ] VolumeAnalyzer class
  - [ ] IntensityAnalyzer class
  - [ ] PerformanceComparator class

### Testing & Integration
- [ ] Cross-domain integration tests (Exercise ↔ Workout)
- [ ] Builder pattern tests
- [ ] Analytics calculation tests
- [ ] Performance optimization tests
- [ ] End-to-end workout workflow tests

## Milestone 3 Completion Criteria
- [ ] Exercise domain fully functional with draft/publish workflow
- [ ] Exercise validation system operational (decomposed, no god objects)
- [ ] Workout domain with proper state management
- [ ] Workout-Exercise integration working seamlessly
- [ ] All business rules implemented and tested
- [ ] State machine transitions working correctly
- [ ] 100% test coverage for business logic
- [ ] Performance benchmarks for workout operations
- [ ] Integration with IAM system verified
- [ ] Documentation for all business APIs
- [ ] Code review and security audit completed
- [ ] End-to-end user workflows functional
# 🎯 Milestone 5: Application Layer - Commands & Queries

## Part 32: User Context - Application Layer
### src/contexts/user-management/application/commands/
- [ ] `CreateUserCommand` (`CreateUserCommand.ts`) `user_context`
- [ ] `UpdateUserCommand` (`UpdateUserCommand.ts`) `user_context`
- [ ] `DeactivateUserCommand` (`DeactivateUserCommand.ts`) `user_context`
- [ ] `ChangePasswordCommand` (`ChangePasswordCommand.ts`) `user_context`
- [ ] `AddFavoriteCommand` (`AddFavoriteCommand.ts`) `user_context`
- [ ] `RecordActivityCommand` (`RecordActivityCommand.ts`) `user_context`

### src/contexts/user-management/application/commands/handlers/
- [ ] `CreateUserHandler` (`CreateUserHandler.ts`) `user_context`
- [ ] `UpdateUserHandler` (`UpdateUserHandler.ts`) `user_context`
- [ ] `DeactivateUserHandler` (`DeactivateUserHandler.ts`) `user_context`
- [ ] `ChangePasswordHandler` (`ChangePasswordHandler.ts`) `user_context`
- [ ] `AddFavoriteHandler` (`AddFavoriteHandler.ts`) `user_context`
- [ ] `RecordActivityHandler` (`RecordActivityHandler.ts`) `user_context`

### src/contexts/user-management/application/queries/
- [ ] `GetUserQuery` (`GetUserQuery.ts`) `user_context`
- [ ] `GetUserActivityQuery` (`GetUserActivityQuery.ts`) `user_context`
- [ ] `GetUserFavoritesQuery` (`GetUserFavoritesQuery.ts`) `user_context`
- [ ] `GetUserStatsQuery` (`GetUserStatsQuery.ts`) `user_context`

### src/contexts/user-management/application/queries/handlers/
- [ ] `GetUserHandler` (`GetUserHandler.ts`) `user_context`
- [ ] `GetUserActivityHandler` (`GetUserActivityHandler.ts`) `user_context`
- [ ] `GetUserFavoritesHandler` (`GetUserFavoritesHandler.ts`) `user_context`
- [ ] `GetUserStatsHandler` (`GetUserStatsHandler.ts`) `user_context`

### src/contexts/user-management/application/sagas/
- [ ] `UserOnboardingSaga` (`UserOnboardingSaga.ts`) `user_context`
- [ ] `UserDeactivationSaga` (`UserDeactivationSaga.ts`) `user_context`

## Part 33: Organization Context - Application Layer
### src/contexts/organization-management/application/commands/
- [ ] `CreateOrganizationCommand` (`CreateOrganizationCommand.ts`) `organization_context`
- [ ] `UpdateOrganizationCommand` (`UpdateOrganizationCommand.ts`) `organization_context`
- [ ] `AddMemberCommand` (`AddMemberCommand.ts`) `organization_context`
- [ ] `RemoveMemberCommand` (`RemoveMemberCommand.ts`) `organization_context`
- [ ] `ChangeRoleCommand` (`ChangeRoleCommand.ts`) `organization_context`
- [ ] `InviteMemberCommand` (`InviteMemberCommand.ts`) `organization_context`
- [ ] `AcceptInvitationCommand` (`AcceptInvitationCommand.ts`) `organization_context`
- [ ] `UpdateSettingsCommand` (`UpdateSettingsCommand.ts`) `organization_context`

### src/contexts/organization-management/application/commands/handlers/
- [ ] `CreateOrganizationHandler` (`CreateOrganizationHandler.ts`) `organization_context`
- [ ] `UpdateOrganizationHandler` (`UpdateOrganizationHandler.ts`) `organization_context`
- [ ] `AddMemberHandler` (`AddMemberHandler.ts`) `organization_context`
- [ ] `RemoveMemberHandler` (`RemoveMemberHandler.ts`) `organization_context`
- [ ] `ChangeRoleHandler` (`ChangeRoleHandler.ts`) `organization_context`
- [ ] `InviteMemberHandler` (`InviteMemberHandler.ts`) `organization_context`
- [ ] `AcceptInvitationHandler` (`AcceptInvitationHandler.ts`) `organization_context`
- [ ] `UpdateSettingsHandler` (`UpdateSettingsHandler.ts`) `organization_context`

### src/contexts/organization-management/application/queries/
- [ ] `GetOrganizationQuery` (`GetOrganizationQuery.ts`) `organization_context`
- [ ] `GetMembersQuery` (`GetMembersQuery.ts`) `organization_context`
- [ ] `GetInvitationsQuery` (`GetInvitationsQuery.ts`) `organization_context`
- [ ] `GetOrgStatsQuery` (`GetOrgStatsQuery.ts`) `organization_context`
- [ ] `GetUserOrgsQuery` (`GetUserOrgsQuery.ts`) `organization_context`

### src/contexts/organization-management/application/queries/handlers/
- [ ] `GetOrganizationHandler` (`GetOrganizationHandler.ts`) `organization_context`
- [ ] `GetMembersHandler` (`GetMembersHandler.ts`) `organization_context`
- [ ] `GetInvitationsHandler` (`GetInvitationsHandler.ts`) `organization_context`
- [ ] `GetOrgStatsHandler` (`GetOrgStatsHandler.ts`) `organization_context`
- [ ] `GetUserOrgsHandler` (`GetUserOrgsHandler.ts`) `organization_context`

### src/contexts/organization-management/application/sagas/
- [ ] `OrgSetupSaga` (`OrgSetupSaga.ts`) `organization_context`
- [ ] `MemberInvitationSaga` (`MemberInvitationSaga.ts`) `organization_context`
- [ ] `OrgDeactivationSaga` (`OrgDeactivationSaga.ts`) `organization_context`

## Part 34: Authentication Context - Application Layer
### src/contexts/authentication/application/commands/
- [ ] `LoginCommand` (`LoginCommand.ts`) `authentication_context`
- [ ] `LogoutCommand` (`LogoutCommand.ts`) `authentication_context`
- [ ] `RefreshTokenCommand` (`RefreshTokenCommand.ts`) `authentication_context`
- [ ] `ChangePasswordCommand` (`ChangePasswordCommand.ts`) `authentication_context`
- [ ] `ResetPasswordCommand` (`ResetPasswordCommand.ts`) `authentication_context`
- [ ] `EnableMFACommand` (`EnableMFACommand.ts`) `authentication_context`
- [ ] `DisableMFACommand` (`DisableMFACommand.ts`) `authentication_context`
- [ ] `RegisterDeviceCommand` (`RegisterDeviceCommand.ts`) `authentication_context`
- [ ] `RevokeTokenCommand` (`RevokeTokenCommand.ts`) `authentication_context`
- [ ] `OAuth2LoginCommand` (`OAuth2LoginCommand.ts`) `authentication_context`

### src/contexts/authentication/application/commands/handlers/
- [ ] `LoginHandler` (`LoginHandler.ts`) `authentication_context`
- [ ] `LogoutHandler` (`LogoutHandler.ts`) `authentication_context`
- [ ] `RefreshTokenHandler` (`RefreshTokenHandler.ts`) `authentication_context`
- [ ] `ChangePasswordHandler` (`ChangePasswordHandler.ts`) `authentication_context`
- [ ] `ResetPasswordHandler` (`ResetPasswordHandler.ts`) `authentication_context`
- [ ] `EnableMFAHandler` (`EnableMFAHandler.ts`) `authentication_context`
- [ ] `DisableMFAHandler` (`DisableMFAHandler.ts`) `authentication_context`
- [ ] `RegisterDeviceHandler` (`RegisterDeviceHandler.ts`) `authentication_context`
- [ ] `RevokeTokenHandler` (`RevokeTokenHandler.ts`) `authentication_context`
- [ ] `OAuth2LoginHandler` (`OAuth2LoginHandler.ts`) `authentication_context`

### src/contexts/authentication/application/queries/
- [ ] `ValidateTokenQuery` (`ValidateTokenQuery.ts`) `authentication_context`
- [ ] `GetSessionQuery` (`GetSessionQuery.ts`) `authentication_context`
- [ ] `GetActiveSessionsQuery` (`GetActiveSessionsQuery.ts`) `authentication_context`
- [ ] `GetLoginHistoryQuery` (`GetLoginHistoryQuery.ts`) `authentication_context`
- [ ] `CheckPermissionQuery` (`CheckPermissionQuery.ts`) `authentication_context`
- [ ] `GetMFAStatusQuery` (`GetMFAStatusQuery.ts`) `authentication_context`
- [ ] `GetDeviceTokensQuery` (`GetDeviceTokensQuery.ts`) `authentication_context`

### src/contexts/authentication/application/queries/handlers/
- [ ] `ValidateTokenHandler` (`ValidateTokenHandler.ts`) `authentication_context`
- [ ] `GetSessionHandler` (`GetSessionHandler.ts`) `authentication_context`
- [ ] `GetActiveSessionsHandler` (`GetActiveSessionsHandler.ts`) `authentication_context`
- [ ] `GetLoginHistoryHandler` (`GetLoginHistoryHandler.ts`) `authentication_context`
- [ ] `CheckPermissionHandler` (`CheckPermissionHandler.ts`) `authentication_context`
- [ ] `GetMFAStatusHandler` (`GetMFAStatusHandler.ts`) `authentication_context`
- [ ] `GetDeviceTokensHandler` (`GetDeviceTokensHandler.ts`) `authentication_context`

### src/contexts/authentication/application/sagas/
- [ ] `LoginSaga` (`LoginSaga.ts`) `authentication_context`
- [ ] `PasswordResetSaga` (`PasswordResetSaga.ts`) `authentication_context`
- [ ] `AccountLockoutSaga` (`AccountLockoutSaga.ts`) `authentication_context`
- [ ] `SessionTimeoutSaga` (`SessionTimeoutSaga.ts`) `authentication_context`
- [ ] `SecurityAlertSaga` (`SecurityAlertSaga.ts`) `authentication_context`

## Part 35: Exercise Context - Application Layer
### src/contexts/exercise-management/application/commands/
- [ ] `CreateExerciseCommand` (`CreateExerciseCommand.ts`) `exercise_context`
- [ ] `UpdateExerciseCommand` (`UpdateExerciseCommand.ts`) `exercise_context`
- [ ] `AddAlternativeCommand` (`AddAlternativeCommand.ts`) `exercise_context`
- [ ] `AddProgressionCommand` (`AddProgressionCommand.ts`) `exercise_context`
- [ ] `SwapExerciseCommand` (`SwapExerciseCommand.ts`) `exercise_context`
- [ ] `AddEquipmentCommand` (`AddEquipmentCommand.ts`) `exercise_context`
- [ ] `UploadMediaCommand` (`UploadMediaCommand.ts`) `exercise_context`

### src/contexts/exercise-management/application/commands/handlers/
- [ ] `CreateExerciseHandler` (`CreateExerciseHandler.ts`) `exercise_context`
- [ ] `UpdateExerciseHandler` (`UpdateExerciseHandler.ts`) `exercise_context`
- [ ] `AddAlternativeHandler` (`AddAlternativeHandler.ts`) `exercise_context`
- [ ] `AddProgressionHandler` (`AddProgressionHandler.ts`) `exercise_context`
- [ ] `SwapExerciseHandler` (`SwapExerciseHandler.ts`) `exercise_context`
- [ ] `AddEquipmentHandler` (`AddEquipmentHandler.ts`) `exercise_context`
- [ ] `UploadMediaHandler` (`UploadMediaHandler.ts`) `exercise_context`

### src/contexts/exercise-management/application/queries/
- [ ] `GetExerciseQuery` (`GetExerciseQuery.ts`) `exercise_context`
- [ ] `SearchExercisesQuery` (`SearchExercisesQuery.ts`) `exercise_context`
- [ ] `GetAlternativesQuery` (`GetAlternativesQuery.ts`) `exercise_context`
- [ ] `GetProgressionsQuery` (`GetProgressionsQuery.ts`) `exercise_context`
- [ ] `GetEquipmentQuery` (`GetEquipmentQuery.ts`) `exercise_context`
- [ ] `GetMuscleGroupsQuery` (`GetMuscleGroupsQuery.ts`) `exercise_context`
- [ ] `RecommendExercisesQuery` (`RecommendExercisesQuery.ts`) `exercise_context`

### src/contexts/exercise-management/application/queries/handlers/
- [ ] `GetExerciseHandler` (`GetExerciseHandler.ts`) `exercise_context`
- [ ] `SearchExercisesHandler` (`SearchExercisesHandler.ts`) `exercise_context`
- [ ] `GetAlternativesHandler` (`GetAlternativesHandler.ts`) `exercise_context`
- [ ] `GetProgressionsHandler` (`GetProgressionsHandler.ts`) `exercise_context`
- [ ] `GetEquipmentHandler` (`GetEquipmentHandler.ts`) `exercise_context`
- [ ] `GetMuscleGroupsHandler` (`GetMuscleGroupsHandler.ts`) `exercise_context`
- [ ] `RecommendExercisesHandler` (`RecommendExercisesHandler.ts`) `exercise_context`

### src/contexts/exercise-management/application/sagas/
- [ ] `ExerciseCreationSaga` (`ExerciseCreationSaga.ts`) `exercise_context`
- [ ] `MediaProcessingSaga` (`MediaProcessingSaga.ts`) `exercise_context`
- [ ] `RecommendationUpdateSaga` (`RecommendationUpdateSaga.ts`) `exercise_context`

## Part 36: Workout Context - Application Layer
### src/contexts/workout/application/commands/
- [ ] `CreateWorkoutCommand` (`CreateWorkoutCommand.ts`) `workout_context`
- [ ] `UpdateWorkoutCommand` (`UpdateWorkoutCommand.ts`) `workout_context`
- [ ] `AddBlockCommand` (`AddBlockCommand.ts`) `workout_context`
- [ ] `AddExerciseCommand` (`AddExerciseCommand.ts`) `workout_context`
- [ ] `ReorderExercisesCommand` (`ReorderExercisesCommand.ts`) `workout_context`
- [ ] `SaveAsTemplateCommand` (`SaveAsTemplateCommand.ts`) `workout_context`
- [ ] `UploadWorkoutMediaCommand` (`UploadWorkoutMediaCommand.ts`) `workout_context`
- [ ] `DeleteWorkoutCommand` (`DeleteWorkoutCommand.ts`) `workout_context`

### src/contexts/workout/application/commands/handlers/
- [ ] `CreateWorkoutHandler` (`CreateWorkoutHandler.ts`) `workout_context`
- [ ] `UpdateWorkoutHandler` (`UpdateWorkoutHandler.ts`) `workout_context`
- [ ] `AddBlockHandler` (`AddBlockHandler.ts`) `workout_context`
- [ ] `AddExerciseHandler` (`AddExerciseHandler.ts`) `workout_context`
- [ ] `ReorderExercisesHandler` (`ReorderExercisesHandler.ts`) `workout_context`
- [ ] `SaveAsTemplateHandler` (`SaveAsTemplateHandler.ts`) `workout_context`
- [ ] `UploadWorkoutMediaHandler` (`UploadWorkoutMediaHandler.ts`) `workout_context`
- [ ] `DeleteWorkoutHandler` (`DeleteWorkoutHandler.ts`) `workout_context`

### src/contexts/workout/application/queries/
- [ ] `GetWorkoutQuery` (`GetWorkoutQuery.ts`) `workout_context`
- [ ] `GetWorkoutTemplatesQuery` (`GetWorkoutTemplatesQuery.ts`) `workout_context`
- [ ] `GetWorkoutHistoryQuery` (`GetWorkoutHistoryQuery.ts`) `workout_context`
- [ ] `SearchWorkoutsQuery` (`SearchWorkoutsQuery.ts`) `workout_context`
- [ ] `GetPopularWorkoutsQuery` (`GetPopularWorkoutsQuery.ts`) `workout_context`
- [ ] `GetWorkoutStatsQuery` (`GetWorkoutStatsQuery.ts`) `workout_context`

### src/contexts/workout/application/queries/handlers/
- [ ] `GetWorkoutHandler` (`GetWorkoutHandler.ts`) `workout_context`
- [ ] `GetWorkoutTemplatesHandler` (`GetWorkoutTemplatesHandler.ts`) `workout_context`
- [ ] `GetWorkoutHistoryHandler` (`GetWorkoutHistoryHandler.ts`) `workout_context`
- [ ] `SearchWorkoutsHandler` (`SearchWorkoutsHandler.ts`) `workout_context`
- [ ] `GetPopularWorkoutsHandler` (`GetPopularWorkoutsHandler.ts`) `workout_context`
- [ ] `GetWorkoutStatsHandler` (`GetWorkoutStatsHandler.ts`) `workout_context`

### src/contexts/workout/application/sagas/
- [ ] `WorkoutCreationSaga` (`WorkoutCreationSaga.ts`) `workout_context`
- [ ] `MediaProcessingSaga` (`MediaProcessingSaga.ts`) `workout_context`
- [ ] `WorkoutSharingSaga` (`WorkoutSharingSaga.ts`) `workout_context`
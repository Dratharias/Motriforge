# 👤 Milestone 3: User Management & Organization Context

## Part 1: User Management Types

### src/types/user/
- [ ] `user-types.ts` `user_context`
- [ ] `activity-types.ts` `user_context`
- [ ] `favorite-types.ts` `user_context`
- [ ] `profile-types.ts` `user_context`

### src/types/user/enums/
- [ ] `user-status.ts` `user_context`
- [ ] `activity-types.ts` `user_context`
- [ ] `user-roles.ts` `user_context`

### src/types/organization/
- [ ] `organization-types.ts` `organization_context`
- [ ] `membership-types.ts` `organization_context`
- [ ] `invitation-types.ts` `organization_context`
- [ ] `department-types.ts` `organization_context`

### src/types/organization/enums/
- [ ] `org-status.ts` `organization_context`
- [ ] `member-roles.ts` `organization_context`
- [ ] `invitation-status.ts` `organization_context`

## Part 2: User Domain Models

### src/contexts/user/domain/aggregates/
- [ ] `User.ts` `user_context`
- [ ] `UserActivity.ts` `user_context`
- [ ] `UserFavorites.ts` `user_context`

### src/contexts/user/domain/entities/
- [ ] `RefreshToken.ts` `user_context`
- [ ] `DeviceToken.ts` `user_context`
- [ ] `ActivityEntry.ts` `user_context`
- [ ] `Role.ts` `user_context`

### src/contexts/user/domain/value-objects/
- [ ] `UserId.ts` `user_context`
- [ ] `Email.ts` `user_context`
- [ ] `UserName.ts` `user_context`
- [ ] `ProfileImage.ts` `user_context`

### src/contexts/user/domain/services/
- [ ] `UserValidationService.ts` `user_context`
- [ ] `ActivityTrackingService.ts` `user_context`

## Part 3: Organization Domain Models

### src/contexts/organization/domain/aggregates/
- [ ] `Organization.ts` `organization_context`
- [ ] `OrganizationMembership.ts` `organization_context`
- [ ] `OrgPermissionMatrix.ts` `organization_context`
- [ ] `OrganizationSubscription.ts` `organization_context`

### src/contexts/organization/domain/entities/
- [ ] `OrganizationMember.ts` `organization_context`
- [ ] `Invitation.ts` `organization_context`
- [ ] `OrgSettings.ts` `organization_context`
- [ ] `Department.ts` `organization_context`
- [ ] `OrgRole.ts` `organization_context`
- [ ] `Permission.ts` `organization_context`

### src/contexts/organization/domain/value-objects/
- [ ] `OrgId.ts` `organization_context`
- [ ] `OrgName.ts` `organization_context`
- [ ] `MemberRole.ts` `organization_context`
- [ ] `InvitationToken.ts` `organization_context`

### src/contexts/organization/domain/services/
- [ ] `MembershipService.ts` `organization_context`
- [ ] `InvitationService.ts` `organization_context`
- [ ] `OrgValidationService.ts` `organization_context`
- [ ] `PermissionManagementService.ts` `organization_context`

## Part 4: Repository Infrastructure

### src/contexts/user/domain/ports/
- [ ] `IUserRepository.ts` `user_context`
- [ ] `IActivityRepository.ts` `user_context`
- [ ] `IFavoriteRepository.ts` `user_context`
- [ ] `ITokenRepository.ts` `user_context`

### src/contexts/user/infrastructure/repositories/
- [ ] `MongoUserRepository.ts` `user_context`
- [ ] `MongoActivityRepository.ts` `user_context`
- [ ] `MongoFavoriteRepository.ts` `user_context`
- [ ] `RedisTokenRepository.ts` `user_context`

### src/contexts/organization/domain/ports/
- [ ] `IOrganizationRepository.ts` `organization_context`
- [ ] `IMemberRepository.ts` `organization_context`
- [ ] `IInvitationRepository.ts` `organization_context`
- [ ] `IDepartmentRepository.ts` `organization_context`

### src/contexts/organization/infrastructure/repositories/
- [ ] `MongoOrganizationRepository.ts` `organization_context`
- [ ] `MongoMemberRepository.ts` `organization_context`
- [ ] `MongoInvitationRepository.ts` `organization_context`
- [ ] `MongoDepartmentRepository.ts` `organization_context`

## Part 5: Application Services & Use Cases

### src/contexts/user/application/commands/
- [ ] `CreateUserCommand.ts` `user_context`
- [ ] `UpdateUserCommand.ts` `user_context`
- [ ] `DeactivateUserCommand.ts` `user_context`
- [ ] `RecordActivityCommand.ts` `user_context`
- [ ] `AddFavoriteCommand.ts` `user_context`

### src/contexts/user/application/queries/
- [ ] `GetUserQuery.ts` `user_context`
- [ ] `GetUserActivityQuery.ts` `user_context`
- [ ] `GetUserFavoritesQuery.ts` `user_context`
- [ ] `GetUserStatsQuery.ts` `user_context`

### src/contexts/organization/application/commands/
- [ ] `CreateOrgCommand.ts` `organization_context`
- [ ] `AddMemberCommand.ts` `organization_context`
- [ ] `InviteMemberCommand.ts` `organization_context`
- [ ] `UpdateMemberRoleCommand.ts` `organization_context`
- [ ] `CreateDepartmentCommand.ts` `organization_context`

### src/contexts/organization/application/queries/
- [ ] `GetOrgQuery.ts` `organization_context`
- [ ] `GetMembersQuery.ts` `organization_context`
- [ ] `GetInvitationsQuery.ts` `organization_context`
- [ ] `GetUserOrgsQuery.ts` `organization_context`

### src/contexts/user/application/services/
- [ ] `UserApplicationService.ts` `user_context`

### src/contexts/organization/application/services/
- [ ] `OrganizationApplicationService.ts` `organization_context`

## Part 6: External Service Adapters

### src/contexts/user/infrastructure/adapters/
- [ ] `BcryptHasher.ts` `user_context`
- [ ] `SendGridEmailAdapter.ts` `user_context`
- [ ] `S3StorageAdapter.ts` `user_context`
- [ ] `FirebasePushAdapter.ts` `user_context`

### src/contexts/organization/infrastructure/adapters/
- [ ] `SendGridEmailAdapter.ts` `organization_context`
- [ ] `StripeAdapter.ts` `organization_context`
- [ ] `Auth0PermissionAdapter.ts` `organization_context`

**📋 Completion Criteria:**
- User management system is fully operational
- Organization context with membership management
- User registration and profile management
- Organization creation and member invitation system
- Basic user activity tracking
- Integration with identity context
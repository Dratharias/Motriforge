```mermaid
classDiagram
    %% Organization Facade and Related Components
    
    class OrganizationFacade {
        -organizationService: OrganizationService
        -membershipService: MembershipService
        -authService: AuthService
        -cacheFacade: CacheFacade
        -eventMediator: EventMediator
        +getCurrentOrganization(): Organization|null
        +getUserOrganizations(): Promise~Organization[]~
        +switchOrganization(organizationId: string): Promise~void~
        +createOrganization(data: OrganizationCreationData): Promise~Organization~
        +updateOrganization(organizationId: string, updates: OrganizationUpdateData): Promise~Organization~
        +getOrganizationById(organizationId: string): Promise~Organization~
        +deleteOrganization(organizationId: string): Promise~void~
        +getOrganizationMembers(): Promise~OrganizationMember[]~
        +inviteMember(email: string, role: string): Promise~InviteResult~
        +removeMember(userId: string): Promise~void~
        +updateMemberRole(userId: string, role: string): Promise~void~
        +canManageOrganization(): Promise~boolean~
        +canManageMembers(): Promise~boolean~
    }
    
    class OrganizationService {
        -organizationRepository: OrganizationRepository
        -userRepository: UserRepository
        -eventMediator: EventMediator
        -orgCache: OrganizationCache
        +getOrganizationById(id: string): Promise~Organization~
        +getUserOrganizations(userId: string): Promise~Organization[]~
        +createOrganization(data: OrganizationCreationData): Promise~Organization~
        +updateOrganization(id: string, updates: OrganizationUpdateData): Promise~Organization~
        +deleteOrganization(id: string): Promise~void~
        +setUserActiveOrganization(userId: string, organizationId: string): Promise~void~
        +getOrganizationOwners(organizationId: string): Promise~User[]~
        +getOrganizationSettings(organizationId: string): Promise~OrganizationSettings~
        +updateOrganizationSettings(organizationId: string, settings: OrganizationSettingsUpdate): Promise~OrganizationSettings~
        -validateOrganizationData(data: OrganizationCreationData): ValidationResult
        -getCachedOrganization(id: string): Promise~Organization~
        -invalidateOrgCache(id: string): void
    }
    
    class MembershipService {
        -organizationRepository: OrganizationRepository
        -userRepository: UserRepository
        -invitationService: InvitationService
        -permissionService: PermissionService
        -eventMediator: EventMediator
        -membershipCache: MembershipCache
        +getOrganizationMembers(organizationId: string): Promise~OrganizationMember[]~
        +addMember(organizationId: string, userId: string, role: string): Promise~OrganizationMember~
        +removeMember(organizationId: string, userId: string): Promise~boolean~
        +updateMemberRole(organizationId: string, userId: string, role: string): Promise~OrganizationMember~
        +inviteMember(organizationId: string, email: string, role: string): Promise~Invitation~
        +acceptInvitation(invitationId: string): Promise~OrganizationMember~
        +rejectInvitation(invitationId: string): Promise~void~
        +isMember(organizationId: string, userId: string): Promise~boolean~
        +getMemberRole(organizationId: string, userId: string): Promise~string~
        +canManageMembers(organizationId: string, userId: string): Promise~boolean~
        -validateMembershipChange(organizationId: string, currentUserId: string, targetUserId: string): Promise~boolean~
        -getCachedMembership(organizationId: string, userId: string): Promise~OrganizationMember~
        -invalidateMembershipCache(organizationId: string, userId: string): void
    }
    
    class OrganizationRepository {
        -db: Database
        -organizationCollection: string
        -membershipCollection: string
        -invitationCollection: string
        +findById(id: string): Promise~Organization~
        +findByName(name: string): Promise~Organization~
        +findByOwner(ownerId: string): Promise~Organization[]~
        +findForUser(userId: string): Promise~Organization[]~
        +create(data: OrganizationCreationData): Promise~Organization~
        +update(id: string, updates: OrganizationUpdateData): Promise~Organization~
        +delete(id: string): Promise~boolean~
        +getMembers(organizationId: string): Promise~OrganizationMember[]~
        +getMember(organizationId: string, userId: string): Promise~OrganizationMember~
        +addMember(organizationId: string, member: MemberData): Promise~OrganizationMember~
        +removeMember(organizationId: string, userId: string): Promise~boolean~
        +updateMember(organizationId: string, userId: string, updates: MemberUpdateData): Promise~OrganizationMember~
        +createInvitation(invitation: InvitationData): Promise~Invitation~
        +findInvitation(id: string): Promise~Invitation~
        +findInvitationByEmail(organizationId: string, email: string): Promise~Invitation~
        +deleteInvitation(id: string): Promise~boolean~
    }
    
    class InvitationService {
        -organizationRepository: OrganizationRepository
        -userRepository: UserRepository
        -emailService: EmailService
        -tokenService: TokenService
        -eventMediator: EventMediator
        +createInvitation(organizationId: string, email: string, role: string, inviterId: string): Promise~Invitation~
        +sendInvitationEmail(invitation: Invitation): Promise~void~
        +validateInvitation(invitationId: string): Promise~Invitation~
        +acceptInvitation(invitationId: string, userId: string): Promise~OrganizationMember~
        +rejectInvitation(invitationId: string): Promise~void~
        +getInvitationByToken(token: string): Promise~Invitation~
        +resendInvitation(invitationId: string): Promise~void~
        -generateInvitationToken(organizationId: string, email: string): string
    }
    
    class Organization {
        +id: string
        +name: string
        +description: string
        +ownerId: string
        +settings: OrganizationSettings
        +createdAt: Date
        +updatedAt: Date
        +isActive: boolean
    }
    
    class OrganizationMember {
        +organizationId: string
        +userId: string
        +role: string
        +joinedAt: Date
        +invitedBy?: string
        +permissions?: string[]
    }
    
    class Invitation {
        +id: string
        +organizationId: string
        +email: string
        +role: string
        +token: string
        +invitedBy: string
        +expiresAt: Date
        +status: 'pending' | 'accepted' | 'rejected' | 'expired'
    }
    
    class OrganizationEndpoints {
        <<enumeration>>
        LIST: "/api/organizations"
        CREATE: "/api/organizations"
        GET: "/api/organizations/:id"
        UPDATE: "/api/organizations/:id"
        DELETE: "/api/organizations/:id"
        MEMBERS: "/api/organizations/:id/members"
        MEMBER: "/api/organizations/:id/members/:userId"
        INVITE: "/api/organizations/:id/invite"
        ACCEPT_INVITE: "/api/organizations/invitations/:id/accept"
        REJECT_INVITE: "/api/organizations/invitations/:id/reject"
        SWITCH: "/api/organizations/:id/switch"
        SETTINGS: "/api/organizations/:id/settings"
    }
    
    %% Relationships
    OrganizationFacade --> OrganizationService : uses
    OrganizationFacade --> MembershipService : uses
    
    OrganizationService --> OrganizationRepository : uses
    MembershipService --> OrganizationRepository : uses
    MembershipService --> InvitationService : uses
    
    InvitationService --> OrganizationRepository : uses
    
    OrganizationRepository --> Organization : manages
    OrganizationRepository --> OrganizationMember : manages
    OrganizationRepository --> Invitation : manages```

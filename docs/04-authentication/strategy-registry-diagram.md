```mermaid
classDiagram
    %% Strategy Registry Class Diagram
    
    class AuthStrategy {
        <<interface>>
        +authenticate(credentials: any): Promise~AuthResult~
        +validateCredentials(credentials: any): boolean
        +getAuthController(): AuthController
        +getRouteConfig(): RouteConfig
        +supportsCredentialType(type: string): boolean
    }
    
    class StrategyRegistry {
        -strategies: Map~string, AuthStrategy~
        -defaultStrategy: string
        -eventMediator: EventMediator
        +registerStrategy(name: string, strategy: AuthStrategy): void
        +getStrategy(name: string): AuthStrategy
        +getAllStrategies(): AuthStrategy[]
        +getDefaultStrategy(): AuthStrategy
        +setDefaultStrategy(name: string): void
        +resolveStrategy(credentialType: string): AuthStrategy
        +getStrategiesForRoute(): RouteConfig[]
    }
    
    class EmailPasswordStrategy {
        -userRepository: UserRepository
        -passwordHasher: PasswordHasher
        -tokenService: TokenService
        -configuration: EmailPasswordConfig
        +authenticate(credentials: EmailPasswordCredentials): Promise~AuthResult~
        +validateCredentials(credentials: EmailPasswordCredentials): boolean
        +getAuthController(): LoginController
        +getRouteConfig(): RouteConfig
        -validatePassword(storedHash: string, password: string): Promise~boolean~
    }
    
    class OAuthStrategy {
        -provider: OAuthProvider
        -clientId: string
        -clientSecret: string
        -redirectUri: string
        -scope: string[]
        -userRepository: UserRepository
        -tokenService: TokenService
        +authenticate(credentials: OAuthCredentials): Promise~AuthResult~
        +validateCredentials(credentials: OAuthCredentials): boolean
        +getAuthController(): OAuthController
        +getRouteConfig(): RouteConfig
        +getAuthorizationUrl(state: string): string
        -handleCallback(code: string, state: string): Promise~AuthResult~
        -getUserProfile(accessToken: string): Promise~OAuthUserProfile~
    }
    
    class MagicLinkStrategy {
        -userRepository: UserRepository
        -tokenService: TokenService
        -emailService: EmailService
        -configuration: MagicLinkConfig
        +authenticate(credentials: MagicLinkCredentials): Promise~AuthResult~
        +validateCredentials(credentials: MagicLinkCredentials): boolean
        +getAuthController(): MagicLinkController
        +getRouteConfig(): RouteConfig
        +sendMagicLink(email: string): Promise~void~
        -validateMagicLink(token: string): Promise~User~
    }
    
    class MFAStrategyDecorator {
        -baseStrategy: AuthStrategy
        -mfaService: MFAService
        -userRepository: UserRepository
        +authenticate(credentials: MFACredentials): Promise~AuthResult~
        +validateCredentials(credentials: MFACredentials): boolean
        +getAuthController(): MFAController
        +getRouteConfig(): RouteConfig
        +supportsCredentialType(type: string): boolean
        -validateMFACode(userId: string, factorType: string, code: string): Promise~boolean~
        -requiresMFA(userId: string): Promise~boolean~
    }
    
    class AuthStrategyConfig {
        +name: string
        +type: string
        +enabled: boolean
        +priority: number
        +config: Record~string, any~
        +mfaEnabled: boolean
    }
    
    class StrategyFactory {
        -userRepository: UserRepository
        -tokenService: TokenService
        -emailService: EmailService
        -mfaService: MFAService
        -passwordHasher: PasswordHasher
        +createStrategy(config: AuthStrategyConfig): AuthStrategy
        +createEmailPasswordStrategy(config: EmailPasswordConfig): EmailPasswordStrategy
        +createOAuthStrategy(config: OAuthConfig): OAuthStrategy
        +createMagicLinkStrategy(config: MagicLinkConfig): MagicLinkStrategy
        +wrapWithMFA(strategy: AuthStrategy): MFAStrategyDecorator
    }
    
    %% Relationships
    EmailPasswordStrategy --|> AuthStrategy : implements
    OAuthStrategy --|> AuthStrategy : implements
    MagicLinkStrategy --|> AuthStrategy : implements
    MFAStrategyDecorator --|> AuthStrategy : implements
    
    StrategyRegistry --> AuthStrategy : manages
    StrategyRegistry --> StrategyFactory : uses
    
    MFAStrategyDecorator --> AuthStrategy : decorates
    StrategyFactory --> EmailPasswordStrategy : creates
    StrategyFactory --> OAuthStrategy : creates
    StrategyFactory --> MagicLinkStrategy : creates
    StrategyFactory --> MFAStrategyDecorator : creates```

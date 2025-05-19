```mermaid
classDiagram
    %% Auth Strategy Class Diagram
    
    class AuthStrategy {
        <<interface>>
        +authenticate(credentials: any): Promise~AuthResult~
        +validateCredentials(credentials: any): boolean
        +getAuthController(): AuthController
        +getRouteConfig(): RouteConfig
        +supportsCredentialType(type: string): boolean
    }
    
    class BaseAuthStrategy {
        #tokenService: TokenService
        #userRepository: UserRepository
        #eventMediator: EventMediator
        #cacheManager: CacheManager
        +authenticate(credentials: any): Promise~AuthResult~
        +validateCredentials(credentials: any): boolean
        #generateAuthToken(user: User, additionalClaims?: object): Promise~string~
        #validateBaseCredentials(credentials: any): boolean
        #notifyAuthEvent(eventType: string, data: any): void
    }
    
    class EmailPasswordStrategy {
        -userRepository: UserRepository
        -passwordHasher: PasswordHasher
        -tokenService: TokenService
        -configuration: EmailPasswordConfig
        -controller: LoginController
        -cache: UserCredentialCache
        +authenticate(credentials: EmailPasswordCredentials): Promise~AuthResult~
        +validateCredentials(credentials: EmailPasswordCredentials): boolean
        +getAuthController(): LoginController
        +getRouteConfig(): RouteConfig
        -validatePassword(storedHash: string, password: string): Promise~boolean~
        -createAuthTokens(user: User): Promise~TokenPair~
    }
    
    class OAuthStrategy {
        -provider: OAuthProvider
        -clientId: string
        -clientSecret: string
        -redirectUri: string
        -scope: string[]
        -userRepository: UserRepository
        -tokenService: TokenService
        -controller: OAuthController
        -cache: OAuthStateCache
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
        -controller: MagicLinkController
        -cache: MagicLinkCache
        +authenticate(credentials: MagicLinkCredentials): Promise~AuthResult~
        +validateCredentials(credentials: MagicLinkCredentials): boolean
        +getAuthController(): MagicLinkController
        +getRouteConfig(): RouteConfig
        +sendMagicLink(email: string): Promise~void~
        -validateMagicLink(token: string): Promise~User~
    }
    
    class WebAuthnStrategy {
        -userRepository: UserRepository
        -webAuthnService: WebAuthnService
        -tokenService: TokenService
        -configuration: WebAuthnConfig
        -controller: WebAuthnController
        +authenticate(credentials: WebAuthnCredentials): Promise~AuthResult~
        +validateCredentials(credentials: WebAuthnCredentials): boolean
        +getAuthController(): WebAuthnController
        +getRouteConfig(): RouteConfig
        +getRegistrationOptions(userId: string): Promise~RegistrationOptions~
        +verifyRegistration(credentials: RegistrationCredentials): Promise~boolean~
        +getAuthenticationOptions(email: string): Promise~AuthenticationOptions~
    }
    
    class JwtStrategy {
        -tokenService: TokenService
        -userRepository: UserRepository
        -configuration: JwtConfig
        -controller: JwtController
        +authenticate(credentials: JwtCredentials): Promise~AuthResult~
        +validateCredentials(credentials: JwtCredentials): boolean
        +getAuthController(): JwtController
        +getRouteConfig(): RouteConfig
        -verifyToken(token: string): Promise~TokenPayload~
    }
    
    class AuthStrategyDecorator {
        <<abstract>>
        #baseStrategy: AuthStrategy
        +authenticate(credentials: any): Promise~AuthResult~
        +validateCredentials(credentials: any): boolean
        +getAuthController(): AuthController
        +getRouteConfig(): RouteConfig
        +supportsCredentialType(type: string): boolean
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
    
    class RateLimitStrategyDecorator {
        -baseStrategy: AuthStrategy
        -rateLimiter: RateLimiter
        -configuration: RateLimitConfig
        +authenticate(credentials: any): Promise~AuthResult~
        +validateCredentials(credentials: any): boolean
        +getAuthController(): AuthController
        +getRouteConfig(): RouteConfig
        -checkRateLimit(identifier: string): Promise~boolean~
        -incrementAttempt(identifier: string): Promise~void~
        -resetAttempts(identifier: string): Promise~void~
    }
    
    class AuthResult {
        +success: boolean
        +user?: User
        +token?: string
        +refreshToken?: string
        +expiresAt?: Date
        +requiresMFA?: boolean
        +mfaOptions?: string[]
        +error?: string
        +errorCode?: string
    }
    
    %% Relationships
    BaseAuthStrategy --|> AuthStrategy : implements
    EmailPasswordStrategy --|> BaseAuthStrategy : extends
    OAuthStrategy --|> BaseAuthStrategy : extends
    MagicLinkStrategy --|> BaseAuthStrategy : extends
    WebAuthnStrategy --|> BaseAuthStrategy : extends
    JwtStrategy --|> BaseAuthStrategy : extends
    
    AuthStrategyDecorator --|> AuthStrategy : implements
    MFAStrategyDecorator --|> AuthStrategyDecorator : extends
    RateLimitStrategyDecorator --|> AuthStrategyDecorator : extends
    
    MFAStrategyDecorator --> AuthStrategy : decorates
    RateLimitStrategyDecorator --> AuthStrategy : decorates```

import * as bcrypt from 'bcrypt'
import { JWTService } from '@/shared/utils/jwt.service'
import { UserRepository } from '@/shared/database/repositories/user.repository'
import { AuthConfig } from '../config/auth.config'
import { logger } from '../utils/logger'
import { AgeAnonymizer, mapPrismaAgeRange } from '@/shared/utils/age-anonymizer'
import { 
  AuthenticationError, 
  ValidationError, 
  BusinessLogicError 
} from '@/shared/types/errors'
import { User, AgeRange } from '@/prisma/generated'

export interface LoginCredentials {
  readonly email: string
  readonly password: string
}

export interface RegisterData {
  readonly email: string
  readonly password: string
  readonly firstName: string
  readonly lastName: string
  readonly dateOfBirth?: Date | null
}

export interface AuthTokens {
  readonly accessToken: string
  readonly refreshToken: string
  readonly expiresIn: number
  readonly tokenType: 'Bearer'
}

export interface AuthResult {
  readonly user: {
    readonly id: string
    readonly email: string
    readonly firstName: string
    readonly lastName: string
    readonly ageRange?: AgeRange | null
  }
  readonly tokens: AuthTokens
}

export interface RefreshTokenRequest {
  readonly refreshToken: string
}

export interface PasswordResetRequest {
  readonly email: string
}

export interface PasswordChangeRequest {
  readonly currentPassword: string
  readonly newPassword: string
}

/**
 * Enhanced Authentication Service with Age Anonymization
 * Uses Prisma-generated AgeRange enum for type compatibility
 */
export class AuthService {
  private readonly userRepository: UserRepository
  private readonly jwtService: JWTService
  private readonly config: AuthConfig
  private readonly loginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map()

  constructor(userRepository: UserRepository, config: AuthConfig) {
    this.userRepository = userRepository
    this.config = config
    this.jwtService = new JWTService(
      config.jwt.secret,
      config.jwt.issuer,
      config.jwt.audience
    )
  }

  public async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const { email, password } = credentials

      this.checkRateLimit(email)

      const user = await this.userRepository.findUserByEmail(email) as User
      if (!user) {
        this.recordFailedAttempt(email)
        throw new AuthenticationError('Invalid email or password')
      }

      const isValidPassword = await bcrypt.compare(password, user.password ?? '')
      if (!isValidPassword) {
        this.recordFailedAttempt(email)
        throw new AuthenticationError('Invalid email or password')
      }

      this.loginAttempts.delete(email)
      await this.userRepository.updateUserLastLogin(user.id)

      const tokens = await this.generateTokens(user)

      logger.info('User logged in successfully', { 
        userId: user.id, 
        email: user.email,
        ageRange: user.ageRange
          ? AgeAnonymizer.getDisplayName(mapPrismaAgeRange(user.ageRange)!)
          : 'not provided'
      })

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          ageRange: user.ageRange,
        },
        tokens
      }
    } catch (error) {
      logger.error('Login failed', { email: credentials.email, error })
      throw error
    }
  }

    /**
   * Validate age requirements for registration
   */
    private validateAgeRequirements(dateOfBirth: Date): void {
      const age = AgeAnonymizer.calculateAge(dateOfBirth)
      const ageRange = AgeAnonymizer.getAgeRange(dateOfBirth)
  
      // Check minimum age requirement (13+ for COPPA compliance)
      if (age < 13) {
        throw new ValidationError('Users must be at least 13 years old to register')
      }
  
      // Log age range for analytics (anonymized)
      logger.info('User registration age validation', {
        ageRange: AgeAnonymizer.getDisplayName(ageRange),
        isMinor: AgeAnonymizer.isMinor(ageRange)
      })
    }

    
  /**
   * Check if user requires parental consent
   */
  public async requiresParentalConsent(userId: string): Promise<boolean> {
    try {
      return await this.userRepository.isUserMinor(userId)
    } catch (error) {
      logger.error('Failed to check parental consent requirement', { userId, error })
      return false // Default to not requiring consent on error
    }
  }

  public async register(data: RegisterData): Promise<AuthResult> {
    try {
      const { email, password, firstName, lastName, dateOfBirth } = data

      this.validatePassword(password)

      const isEmailAvailable = await this.userRepository.isEmailAvailable(email)
      if (!isEmailAvailable) {
        throw new BusinessLogicError('Email already registered')
      }

      const hashedPassword = await bcrypt.hash(password, this.config.password.saltRounds)
      const defaultVisibilityId = 'default-visibility-id' // TODO: Get from system settings

      const user = await this.userRepository.createUser({
        email,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ?? null,
        visibilityId: defaultVisibilityId,
        createdBy: 'system',
        password: hashedPassword
      })

      const tokens = await this.generateTokens(user)

      logger.info('User registered successfully', { 
        userId: user.id, 
        email: user.email,
        ageRange: user.ageRange
          ? AgeAnonymizer.getDisplayName(mapPrismaAgeRange(user.ageRange)!)
          : 'not provided',
        isMinor: user.ageRange
          ? AgeAnonymizer.isMinor(mapPrismaAgeRange(user.ageRange)!)
          : false
      })

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          ageRange: user.ageRange,
        },
        tokens
      }
    } catch (error) {
      logger.error('Registration failed', { email: data.email, error })
      throw error
    }
  }

  public async refreshToken(request: RefreshTokenRequest): Promise<AuthTokens> {
    try {
      const { refreshToken } = request

      const payload = await this.jwtService.verify(refreshToken)
      
      if ((payload as any).type !== 'refresh') {
        throw new AuthenticationError('Invalid refresh token')
      }

      const user = await this.userRepository.findUserById(payload.sub)
      if (!user) {
        throw new AuthenticationError('User not found')
      }

      const tokens = await this.generateTokens(user)

      logger.info('Token refreshed successfully', { userId: user.id })

      return tokens
    } catch (error) {
      logger.error('Token refresh failed', { error })
      throw error
    }
  }

  public async logout(userId: string): Promise<void> {
    try {
      logger.info('User logged out', { userId })
    } catch (error) {
      logger.error('Logout failed', { userId, error })
      throw error
    }
  }

  public async verifyToken(token: string): Promise<User> {
    try {
      const payload = await this.jwtService.verify(token)
      
      const user = await this.userRepository.findUserById(payload.sub)
      if (!user) {
        throw new AuthenticationError('User not found')
      }

      return user
    } catch (error) {
      logger.error('Token verification failed', { error })
      throw error
    }
  }

  public async changePassword(
    userId: string, 
    request: PasswordChangeRequest
  ): Promise<void> {
    try {
      const { currentPassword, newPassword } = request

      const user = await this.userRepository.findUserById(userId) as User
      if (!user) {
        throw new AuthenticationError('User not found')
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password ?? '')
      if (!isValidPassword) {
        throw new AuthenticationError('Current password is incorrect')
      }

      this.validatePassword(newPassword)

      const hashedPassword = await bcrypt.hash(newPassword, this.config.password.saltRounds)

      await this.userRepository.updateUser(userId, { password: hashedPassword })

      logger.info('Password changed successfully', { userId })
    } catch (error) {
      logger.error('Password change failed', { userId, error })
      throw error
    }
  }

  public async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    try {
      const { email } = request

      const user = await this.userRepository.findUserByEmail(email)
      if (!user) {
        logger.warn('Password reset requested for non-existent email', { email })
        return
      }

      logger.info('Password reset requested', { userId: user.id, email })
    } catch (error) {
      logger.error('Password reset request failed', { email: request.email, error })
      throw error
    }
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const accessToken = await this.jwtService.generateToken(
      user.id,
      user.email,
      {
        expiresIn: this.config.jwt.accessTokenExpiry
      }
    )

    const refreshToken = await this.jwtService.generateRefreshToken(
      user.id,
      user.email,
      this.config.jwt.refreshTokenExpiry
    )

    const expiresIn = this.parseTokenExpiry(this.config.jwt.accessTokenExpiry)

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer'
    }
  }

  private validatePassword(password: string): void {
    const { minLength, requireUppercase, requireLowercase, requireNumbers, requireSpecialChars } = this.config.password

    if (password.length < minLength) {
      throw new ValidationError(`Password must be at least ${minLength} characters long`)
    }

    if (requireUppercase && !/[A-Z]/.test(password)) {
      throw new ValidationError('Password must contain at least one uppercase letter')
    }

    if (requireLowercase && !/[a-z]/.test(password)) {
      throw new ValidationError('Password must contain at least one lowercase letter')
    }

    if (requireNumbers && !/\d/.test(password)) {
      throw new ValidationError('Password must contain at least one number')
    }

    if (requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      throw new ValidationError('Password must contain at least one special character')
    }
  }

  private checkRateLimit(email: string): void {
    const attempts = this.loginAttempts.get(email)
    if (!attempts) return

    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime()
    
    if (attempts.count >= this.config.rateLimiting.loginAttempts && 
        timeSinceLastAttempt < this.config.rateLimiting.lockoutDuration) {
      const remainingTime = Math.ceil((this.config.rateLimiting.lockoutDuration - timeSinceLastAttempt) / 1000 / 60)
      throw new AuthenticationError(`Too many login attempts. Try again in ${remainingTime} minutes`)
    }

    if (timeSinceLastAttempt >= this.config.rateLimiting.lockoutDuration) {
      this.loginAttempts.delete(email)
    }
  }

  private recordFailedAttempt(email: string): void {
    const current = this.loginAttempts.get(email)
    this.loginAttempts.set(email, {
      count: (current?.count ?? 0) + 1,
      lastAttempt: new Date()
    })
  }

  private parseTokenExpiry(expiry: string): number {
    const match = RegExp(/^(\d+)([smhd])$/).exec(expiry)
    if (!match) return 900

    const value = parseInt(match[1] ?? '')
    const unit = match[2]

    switch (unit) {
      case 's': return value
      case 'm': return value * 60
      case 'h': return value * 60 * 60
      case 'd': return value * 60 * 60 * 24
      default: return 900
    }
  }
}
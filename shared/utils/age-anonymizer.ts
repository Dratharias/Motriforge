/**
 * Age Anonymizer Service
 * Provides privacy-compliant age categorization and anonymization
 * Implements k-anonymity principles for age data protection
 */

import { $Enums } from "@/prisma/generated"

export enum AgeRange {
  UNDER_13 = 'UNDER_13', // 0-12
  TEEN_13_17 = 'TEEN_13_17', // 13-17  
  YOUNG_18_24 = 'YOUNG_18_24', // 18-24
  ADULT_25_34 = 'ADULT_25_34', // 25-34
  ADULT_35_44 = 'ADULT_35_44', // 35-44
  ADULT_45_54 = 'ADULT_45_54', // 45-54
  ADULT_55_64 = 'ADULT_55_64', // 55-64
  SENIOR_65_PLUS = 'SENIOR_65_PLUS' // 65+
}

export function mapPrismaAgeRange(ageRange: $Enums.AgeRange | null): AgeRange | null {
  if (!ageRange) return null

  // Basic validation
  if (Object.values(AgeRange).includes(ageRange as AgeRange)) {
    return ageRange as AgeRange
  }

  throw new Error(`Unknown AgeRange value from Prisma: ${ageRange}`)
}

interface AgeRangeMetadata {
  readonly displayName: string
  readonly minAge: number
  readonly maxAge: number
  readonly isMinor: boolean
  readonly privacyLevel: 'high' | 'medium' | 'low'
}

export class AgeAnonymizer {
  private static readonly AGE_RANGE_MAP: ReadonlyMap<AgeRange, AgeRangeMetadata> = new Map([
    [AgeRange.UNDER_13, {
      displayName: 'Under 13',
      minAge: 0,
      maxAge: 12,
      isMinor: true,
      privacyLevel: 'high'
    }],
    [AgeRange.TEEN_13_17, {
      displayName: '13-17', 
      minAge: 13,
      maxAge: 17,
      isMinor: true,
      privacyLevel: 'high'
    }],
    [AgeRange.YOUNG_18_24, {
      displayName: '18-24',
      minAge: 18,
      maxAge: 24,
      isMinor: false,
      privacyLevel: 'medium'
    }],
    [AgeRange.ADULT_25_34, {
      displayName: 'Adult',
      minAge: 25,
      maxAge: 34,
      isMinor: false,
      privacyLevel: 'medium'
    }],
    [AgeRange.ADULT_35_44, {
      displayName: 'Adult',
      minAge: 35,
      maxAge: 44,
      isMinor: false,
      privacyLevel: 'low'
    }],
    [AgeRange.ADULT_45_54, {
      displayName: 'Mature Adult',
      minAge: 45,
      maxAge: 54,
      isMinor: false,
      privacyLevel: 'low'
    }],
    [AgeRange.ADULT_55_64, {
      displayName: 'Pre-Senior',
      minAge: 55,
      maxAge: 64,
      isMinor: false,
      privacyLevel: 'low'
    }],
    [AgeRange.SENIOR_65_PLUS, {
      displayName: '65+',
      minAge: 65,
      maxAge: 150,
      isMinor: false,
      privacyLevel: 'medium'
    }]
  ])

  /**
   * Calculate age from date of birth
   * Handles edge cases like leap years and future dates
   */
  public static calculateAge(dateOfBirth: Date): number {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    
    // Handle invalid dates
    if (isNaN(birthDate.getTime())) {
      throw new Error('Invalid date of birth provided')
    }
    
    // Handle future dates
    if (birthDate > today) {
      throw new Error('Date of birth cannot be in the future')
    }
    
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    // If birthday hasn't occurred this year, subtract 1
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return Math.max(0, age)
  }

  /**
   * Get age range category from date of birth
   * Implements k-anonymity by grouping ages into ranges
   */
  public static getAgeRange(dateOfBirth: Date): AgeRange {
    const age = this.calculateAge(dateOfBirth)
    
    // Use inclusive range checks for proper categorization
    if (age <= 12) return AgeRange.UNDER_13
    if (age <= 17) return AgeRange.TEEN_13_17
    if (age <= 24) return AgeRange.YOUNG_18_24
    if (age <= 34) return AgeRange.ADULT_25_34
    if (age <= 44) return AgeRange.ADULT_35_44
    if (age <= 54) return AgeRange.ADULT_45_54
    if (age <= 64) return AgeRange.ADULT_55_64
    
    return AgeRange.SENIOR_65_PLUS
  }

  /**
   * Get display name for age range
   */
  public static getDisplayName(ageRange: AgeRange): string {
    return this.AGE_RANGE_MAP.get(ageRange)?.displayName ?? 'Unknown'
  }

  /**
   * Check if age range represents a minor
   */
  public static isMinor(ageRange: AgeRange): boolean {
    return this.AGE_RANGE_MAP.get(ageRange)?.isMinor ?? false
  }

  /**
   * Check if age range represents an adult
   */
  public static isAdult(ageRange: AgeRange): boolean {
    return !this.isMinor(ageRange)
  }

  /**
   * Get privacy level for age range
   */
  public static getPrivacyLevel(ageRange: AgeRange): 'high' | 'medium' | 'low' {
    return this.AGE_RANGE_MAP.get(ageRange)?.privacyLevel ?? 'high'
  }

  /**
   * Get age range boundaries for analytics (preserving privacy)
   */
  public static getAgeRangeBounds(ageRange: AgeRange): { min: number; max: number } {
    const metadata = this.AGE_RANGE_MAP.get(ageRange)
    if (!metadata) {
      throw new Error(`Invalid age range: ${ageRange}`)
    }
    
    return {
      min: metadata.minAge,
      max: metadata.maxAge === 150 ? Infinity : metadata.maxAge
    }
  }

  /**
   * Validate age range enum value
   */
  public static isValidAgeRange(value: string): boolean {
    return Object.values(AgeRange).includes(value as AgeRange)
  }

  /**
   * Anonymize date of birth to age range
   * Used for data export and external sharing
   */
  public static anonymizeDateOfBirth(dateOfBirth: Date | null): AgeRange | null {
    if (!dateOfBirth) return null
    
    try {
      return this.getAgeRange(dateOfBirth)
    } catch {
      return null
    }
  }

  /**
   * Get all available age ranges with metadata
   */
  public static getAllAgeRanges(): ReadonlyArray<{ range: AgeRange; metadata: AgeRangeMetadata }> {
    return Array.from(this.AGE_RANGE_MAP.entries()).map(([range, metadata]) => ({
      range,
      metadata
    }))
  }
}
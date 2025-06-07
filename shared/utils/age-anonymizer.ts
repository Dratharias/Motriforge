import { AgeRange } from '@/prisma/generated'

export { AgeRange } from '@/prisma/generated'

export interface AgeRangeInfo {
  readonly range: AgeRange
  readonly displayName: string
  readonly minAge: number
  readonly maxAge: number | null
}

export const AGE_RANGES: readonly AgeRangeInfo[] = [
  { range: AgeRange.UNDER_13, displayName: 'Under 13', minAge: 0, maxAge: 12 },
  { range: AgeRange.TEEN_13_17, displayName: '13-17', minAge: 13, maxAge: 17 },
  { range: AgeRange.YOUNG_18_24, displayName: '18-24', minAge: 18, maxAge: 24 },
  { range: AgeRange.ADULT_25_34, displayName: '25-34', minAge: 25, maxAge: 34 },
  { range: AgeRange.ADULT_35_44, displayName: '35-44', minAge: 35, maxAge: 44 },
  { range: AgeRange.ADULT_45_54, displayName: '45-54', minAge: 45, maxAge: 54 },
  { range: AgeRange.ADULT_55_64, displayName: '55-64', minAge: 55, maxAge: 64 },
  { range: AgeRange.SENIOR_65_PLUS, displayName: '65+', minAge: 65, maxAge: null },
] as const

/**
 * Age Anonymization Service
 * Uses Prisma-generated AgeRange enum for type compatibility
 */
export class AgeAnonymizer {
  /**
   * Calculate age from birth date
   */
  public static calculateAge(dateOfBirth: Date): number {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return Math.max(0, age)
  }

  /**
   * Convert birth date to anonymized age range
   */
  public static getAgeRange(dateOfBirth: Date): AgeRange {
    const age = this.calculateAge(dateOfBirth)
    
    for (const rangeInfo of AGE_RANGES) {
      if (age >= rangeInfo.minAge && (rangeInfo.maxAge === null || age <= rangeInfo.maxAge)) {
        return rangeInfo.range
      }
    }
    
    return AgeRange.SENIOR_65_PLUS
  }

  /**
   * Get age range information
   */
  public static getAgeRangeInfo(ageRange: AgeRange): AgeRangeInfo | null {
    return AGE_RANGES.find(info => info.range === ageRange) ?? null
  }

  /**
   * Get display name for age range
   */
  public static getDisplayName(ageRange: AgeRange): string {
    const info = this.getAgeRangeInfo(ageRange)
    return info?.displayName ?? 'Unknown'
  }

  /**
   * Check if user is minor (under 18)
   */
  public static isMinor(ageRange: AgeRange): boolean {
    return ageRange === AgeRange.UNDER_13 || ageRange === AgeRange.TEEN_13_17
  }

  /**
   * Check if user is adult (18+)
   */
  public static isAdult(ageRange: AgeRange): boolean {
    return !this.isMinor(ageRange)
  }

  /**
   * Get age range from exact age
   */
  public static getAgeRangeFromAge(age: number): AgeRange {
    for (const rangeInfo of AGE_RANGES) {
      if (age >= rangeInfo.minAge && (rangeInfo.maxAge === null || age <= rangeInfo.maxAge)) {
        return rangeInfo.range
      }
    }
    
    return AgeRange.SENIOR_65_PLUS
  }

  /**
   * Validate age range enum value
   */
  public static isValidAgeRange(value: string): value is AgeRange {
    return Object.values(AgeRange).includes(value as AgeRange)
  }
}
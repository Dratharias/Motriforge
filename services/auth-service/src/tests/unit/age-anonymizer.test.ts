import { describe, it, expect } from 'vitest'
import { AgeAnonymizer, AgeRange } from '../../../../../shared/utils/age-anonymizer'

describe('AgeAnonymizer', () => {
  describe('calculateAge', () => {
    it('should calculate age correctly', () => {
      const birthDate = new Date('1990-06-15')
      const mockToday = new Date('2024-06-15') // Exact birthday
      
      // Mock current date
      const originalNow = Date.now
      Date.now = () => mockToday.getTime()
      
      const age = AgeAnonymizer.calculateAge(birthDate)
      expect(age).toBe(34)
      
      // Restore original Date.now
      Date.now = originalNow
    })

    it('should handle birthday not yet occurred this year', () => {
      const birthDate = new Date('1990-12-25')
      const mockToday = new Date('2024-06-15') // Before birthday
      
      const originalNow = Date.now
      Date.now = () => mockToday.getTime()
      
      const age = AgeAnonymizer.calculateAge(birthDate)
      expect(age).toBe(33) // Haven't reached 34 yet
      
      Date.now = originalNow
    })
  })

  describe('getAgeRange', () => {
    const testCases = [
      { age: 5, expected: AgeRange.UNDER_13, description: 'child' },
      { age: 12, expected: AgeRange.UNDER_13, description: 'pre-teen' },
      { age: 15, expected: AgeRange.TEEN_13_17, description: 'teenager' },
      { age: 20, expected: AgeRange.YOUNG_18_24, description: 'young adult' },
      { age: 30, expected: AgeRange.ADULT_25_34, description: 'adult' },
      { age: 40, expected: AgeRange.ADULT_35_44, description: 'middle-aged' },
      { age: 55, expected: AgeRange.ADULT_45_54, description: 'mature adult' },
      { age: 60, expected: AgeRange.ADULT_55_64, description: 'pre-senior' },
      { age: 70, expected: AgeRange.SENIOR_65_PLUS, description: 'senior' },
      { age: 100, expected: AgeRange.SENIOR_65_PLUS, description: 'centenarian' },
    ]

    testCases.forEach(({ age, expected, description }) => {
      it(`should categorize ${description} (age ${age}) correctly`, () => {
        const birthDate = new Date()
        birthDate.setFullYear(birthDate.getFullYear() - age)
        
        const ageRange = AgeAnonymizer.getAgeRange(birthDate)
        expect(ageRange).toBe(expected)
      })
    })
  })

  describe('privacy and anonymization features', () => {
    it('should identify minors correctly', () => {
      expect(AgeAnonymizer.isMinor(AgeRange.UNDER_13)).toBe(true)
      expect(AgeAnonymizer.isMinor(AgeRange.TEEN_13_17)).toBe(true)
      expect(AgeAnonymizer.isMinor(AgeRange.YOUNG_18_24)).toBe(false)
      expect(AgeAnonymizer.isMinor(AgeRange.ADULT_25_34)).toBe(false)
    })

    it('should identify adults correctly', () => {
      expect(AgeAnonymizer.isAdult(AgeRange.UNDER_13)).toBe(false)
      expect(AgeAnonymizer.isAdult(AgeRange.TEEN_13_17)).toBe(false)
      expect(AgeAnonymizer.isAdult(AgeRange.YOUNG_18_24)).toBe(true)
      expect(AgeAnonymizer.isAdult(AgeRange.SENIOR_65_PLUS)).toBe(true)
    })

    it('should provide display names for age ranges', () => {
      expect(AgeAnonymizer.getDisplayName(AgeRange.UNDER_13)).toBe('Under 13')
      expect(AgeAnonymizer.getDisplayName(AgeRange.TEEN_13_17)).toBe('13-17')
      expect(AgeAnonymizer.getDisplayName(AgeRange.YOUNG_18_24)).toBe('18-24')
      expect(AgeAnonymizer.getDisplayName(AgeRange.SENIOR_65_PLUS)).toBe('65+')
    })

    it('should validate age range enum values', () => {
      expect(AgeAnonymizer.isValidAgeRange('UNDER_13')).toBe(true)
      expect(AgeAnonymizer.isValidAgeRange('TEEN_13_17')).toBe(true)
      expect(AgeAnonymizer.isValidAgeRange('INVALID_RANGE')).toBe(false)
      expect(AgeAnonymizer.isValidAgeRange('')).toBe(false)
    })
  })
})
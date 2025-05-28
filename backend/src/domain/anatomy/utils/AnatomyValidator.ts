import { MuscleZone, MuscleType, MuscleLevel } from '../../../types/fitness/enums/exercise';
import { IMuscleValidationResult } from '../interfaces/AnatomyInterfaces';

export class AnatomyValidator {
  static validateMuscleName(name: string): IMuscleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('Muscle name is required');
      return { isValid: false, errors, warnings, suggestions };
    }

    const trimmedName = name.trim();

    // Length validation
    if (trimmedName.length < 2) {
      errors.push('Muscle name must be at least 2 characters long');
    }

    if (trimmedName.length > 100) {
      errors.push('Muscle name must be less than 100 characters');
    }

    // Format validation
    if (!/^[a-zA-Z\s\-'.]+$/.test(trimmedName)) {
      errors.push('Muscle name can only contain letters, spaces, hyphens, apostrophes, and periods');
    }

    // Style suggestions
    if (trimmedName !== this.toTitleCase(trimmedName)) {
      suggestions.push(`Consider using title case: "${this.toTitleCase(trimmedName)}"`);
    }

    // Common naming patterns
    if (trimmedName.includes('muscle')) {
      warnings.push('Consider omitting "muscle" from the name as it\'s implied');
    }

    if (trimmedName.length > 50) {
      warnings.push('Long muscle names may be difficult to display in UI components');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  static validateMuscleHierarchy(
    childZone: MuscleZone,
    childType: MuscleType,
    parentZone?: MuscleZone,
    parentType?: MuscleType
  ): IMuscleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (parentZone && parentType) {
      // Zone consistency
      if (childZone !== parentZone) {
        warnings.push(`Child muscle zone (${childZone}) differs from parent zone (${parentZone})`);
      }

      // Type hierarchy rules
      if (parentType === MuscleType.TENDON && childType === MuscleType.MUSCLE) {
        errors.push('A muscle cannot be a child of a tendon');
      }

      if (parentType === MuscleType.LIGAMENT && childType !== MuscleType.LIGAMENT) {
        warnings.push('Ligaments typically only have ligament children');
      }

      // Level suggestions
      suggestions.push('Ensure the parent-child relationship follows anatomical hierarchy');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  static validateMuscleGroup(
    name: string,
    muscleCount: number,
    zones: readonly MuscleZone[]
  ): IMuscleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Name validation
    const nameValidation = this.validateMuscleName(name);
    errors.push(...nameValidation.errors);
    warnings.push(...nameValidation.warnings);
    suggestions.push(...nameValidation.suggestions);

    // Muscle count validation
    if (muscleCount === 0) {
      errors.push('Muscle group must contain at least one muscle');
    }

    if (muscleCount > 50) {
      warnings.push('Large muscle groups may be difficult to manage');
      suggestions.push('Consider splitting into smaller, more focused groups');
    }

    if (muscleCount === 1) {
      warnings.push('Single-muscle groups may not provide significant organizational value');
    }

    // Zone validation
    if (zones.length === 0) {
      errors.push('Muscle group must have at least one primary zone');
    }

    if (zones.length > 5) {
      warnings.push('Groups spanning many zones may lack focus');
      suggestions.push('Consider organizing by primary anatomical region');
    }

    // Naming suggestions based on zones
    if (zones.length === 1 && !name.toLowerCase().includes(zones[0].toLowerCase())) {
      suggestions.push(`Consider including zone name "${zones[0]}" in the group name`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  static validateTargetMuscle(
    primaryCount: number,
    secondaryCount: number,
    stabilizerCount: number,
    synergistCount: number
  ): IMuscleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Primary targets validation
    if (primaryCount === 0) {
      errors.push('At least one primary target muscle is required');
    }

    if (primaryCount > 5) {
      warnings.push('Exercises typically have 1-3 primary target muscles');
      suggestions.push('Consider moving some muscles to secondary targets');
    }

    // Total engagement validation
    const totalMuscles = primaryCount + secondaryCount + stabilizerCount + synergistCount;
    
    if (totalMuscles > 15) {
      warnings.push('High muscle engagement count may indicate overly complex exercise');
      suggestions.push('Focus on the most important muscle groups');
    }

    if (totalMuscles < 2) {
      warnings.push('Most exercises engage multiple muscles');
      suggestions.push('Consider adding stabilizer or synergist muscles');
    }

    // Balance suggestions
    if (secondaryCount > primaryCount * 2) {
      suggestions.push('Consider if some secondary muscles should be primary targets');
    }

    if (stabilizerCount === 0 && primaryCount > 1) {
      suggestions.push('Complex movements typically require stabilizer muscles');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  static validateAnatomicalConsistency(
    muscles: readonly { zone: MuscleZone; type: MuscleType; level: MuscleLevel }[]
  ): IMuscleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (muscles.length === 0) {
      return { isValid: true, errors, warnings, suggestions };
    }

    // Check for anatomical consistency
    const zones = new Set(muscles.map(m => m.zone));
    const types = new Set(muscles.map(m => m.type));
    const levels = new Set(muscles.map(m => m.level));

    // Zone analysis
    if (zones.size > 8) {
      warnings.push('Selection spans many anatomical zones');
      suggestions.push('Consider grouping by related zones');
    }

    // Type analysis
    if (types.has(MuscleType.TENDON) && types.has(MuscleType.MUSCLE)) {
      warnings.push('Mixing tendons and muscles in same selection');
    }

    // Level analysis
    if (levels.has(MuscleLevel.MEDICAL) && levels.has(MuscleLevel.COMMON)) {
      suggestions.push('Consider separating medical and common terminology');
    }

    // Functional grouping suggestions
    const upperBodyZones = [MuscleZone.SHOULDER, MuscleZone.CHEST, MuscleZone.BACK, MuscleZone.BICEPS, MuscleZone.TRICEPS];
    const lowerBodyZones = [MuscleZone.HIP, MuscleZone.QUADRICEPS, MuscleZone.HAMSTRINGS, MuscleZone.GLUTES, MuscleZone.CALF];
    const coreZones = [MuscleZone.ABS, MuscleZone.CORE];

    const hasUpperBody = muscles.some(m => upperBodyZones.includes(m.zone));
    const hasLowerBody = muscles.some(m => lowerBodyZones.includes(m.zone));
    const hasCore = muscles.some(m => coreZones.includes(m.zone));

    if (hasUpperBody && hasLowerBody && hasCore) {
      suggestions.push('Full-body muscle selection detected - consider compound movements');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  private static toTitleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
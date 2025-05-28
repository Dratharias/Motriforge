import { Types } from 'mongoose';
import { Equipment } from '../entities/Equipment';
import {
  IEquipmentRepository,
  IEquipmentCompatibilityService,
  IEquipmentValidationResult
} from '../interfaces/EquipmentInterfaces';
import { EquipmentCategory } from '../../../types/fitness/enums/exercise';

export class EquipmentCompatibilityService implements IEquipmentCompatibilityService {
  constructor(
    private readonly equipmentRepository: IEquipmentRepository
  ) {}

  async checkCompatibility(equipmentId: Types.ObjectId, exerciseId: Types.ObjectId): Promise<boolean> {
    const equipment = await this.equipmentRepository.findById(equipmentId);
    if (!equipment) {
      return false;
    }

    // Check if equipment is available and active
    if (!equipment.isEquipmentAvailable()) {
      return false;
    }

    // Basic compatibility check - would be enhanced with exercise data
    return equipment.isCompatibleWith(exerciseId);
  }

  async findCompatibleEquipment(exerciseId: Types.ObjectId): Promise<readonly Equipment[]> {
    return await this.equipmentRepository.findCompatibleEquipment(exerciseId);
  }

  async findCompatibleExercises(equipmentId: Types.ObjectId): Promise<readonly Types.ObjectId[]> {
    // This would require integration with exercise repository
    // For now, returning empty array as placeholder
    return [];
  }

  async suggestAlternatives(equipmentId: Types.ObjectId): Promise<readonly Equipment[]> {
    const equipment = await this.equipmentRepository.findById(equipmentId);
    if (!equipment) {
      return [];
    }

    // Get explicitly defined alternatives
    const alternatives = await this.equipmentRepository.findAlternatives(equipmentId);

    // If no alternatives defined, suggest based on category and features
    if (alternatives.length === 0) {
      return await this.findSimilarEquipment(equipment);
    }

    return alternatives;
  }

  async validateEquipmentRequirements(
    exerciseId: Types.ObjectId,
    availableEquipment: readonly Types.ObjectId[]
  ): Promise<IEquipmentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Get required equipment for exercise (placeholder - would integrate with exercise domain)
    const requiredEquipment = await this.getRequiredEquipmentForExercise(exerciseId);

    // Check if all required equipment is available
    for (const requiredId of requiredEquipment) {
      const isAvailable = availableEquipment.some(id => id.equals(requiredId));
      if (!isAvailable) {
        const equipment = await this.equipmentRepository.findById(requiredId);
        errors.push(`Required equipment not available: ${equipment?.name ?? 'Unknown'}`);

        // Suggest alternatives
        const alternatives = await this.suggestAlternatives(requiredId);
        if (alternatives.length > 0) {
          suggestions.push(`Consider using alternatives: ${alternatives.map(e => e.name).join(', ')}`);
        }
      }
    }

    // Check equipment condition
    for (const equipmentId of availableEquipment) {
      const equipment = await this.equipmentRepository.findById(equipmentId);
      if (!equipment) continue;

      if (!equipment.isEquipmentAvailable()) {
        warnings.push(`${equipment.name} is currently unavailable`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  private async findSimilarEquipment(equipment: Equipment): Promise<readonly Equipment[]> {
    // Find equipment in the same category
    const sameCategory = await this.equipmentRepository.findByCategory(equipment.category);
    
    // Filter out the original equipment and only include available ones
    const alternatives = sameCategory.filter(e => 
      !e.id.equals(equipment.id) && 
      e.isEquipmentAvailable() &&
      e.organization.equals(equipment.organization)
    );

    // Score alternatives based on similarity
    const scoredAlternatives = alternatives.map(alt => ({
      equipment: alt,
      score: this.calculateSimilarityScore(equipment, alt)
    }));

    // Sort by score and return top alternatives
    return scoredAlternatives
      .toSorted((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.equipment);
  }

  private calculateSimilarityScore(original: Equipment, alternative: Equipment): number {
    let score = 0;

    // Same category gets high score
    if (original.category === alternative.category) {
      score += 50;
    }

    // Compare features
    const originalFeatures = original.specifications.features ?? [];
    const altFeatures = alternative.specifications.features ?? [];
    const commonFeatures = originalFeatures.filter(f => altFeatures.includes(f));
    const featureScore = (commonFeatures.length / Math.max(originalFeatures.length, altFeatures.length)) * 30;
    score += featureScore;

    // Compare capacity (if both have capacity)
    if (original.specifications.capacity && alternative.specifications.capacity) {
      const capacityDiff = Math.abs(
        original.specifications.capacity.value - alternative.specifications.capacity.value
      );
      const maxCapacity = Math.max(
        original.specifications.capacity.value,
        alternative.specifications.capacity.value
      );
      const capacityScore = Math.max(0, 20 - (capacityDiff / maxCapacity) * 20);
      score += capacityScore;
    }

    // Manufacturer bonus
    if (original.specifications.manufacturer === alternative.specifications.manufacturer) {
      score += 10;
    }

    // Safety features comparison
    const originalSafety = original.specifications.safetyFeatures ?? [];
    const altSafety = alternative.specifications.safetyFeatures ?? [];
    const commonSafety = originalSafety.filter(f => altSafety.includes(f));
    const safetyScore = (commonSafety.length / Math.max(originalSafety.length, altSafety.length)) * 15;
    score += safetyScore;

    return score;
  }

  private async getRequiredEquipmentForExercise(exerciseId: Types.ObjectId): Promise<readonly Types.ObjectId[]> {
    // Placeholder - would integrate with exercise domain to get required equipment
    // For now, returning empty array
    return [];
  }

  // Equipment category compatibility matrix
  private getCompatibleCategories(category: EquipmentCategory): readonly EquipmentCategory[] {
    const compatibilityMatrix: Record<EquipmentCategory, readonly EquipmentCategory[]> = {
      [EquipmentCategory.FREE_WEIGHTS]: [
        EquipmentCategory.FREE_WEIGHTS,
        EquipmentCategory.FUNCTIONAL,
        EquipmentCategory.BODYWEIGHT
      ],
      [EquipmentCategory.MACHINES]: [
        EquipmentCategory.MACHINES,
        EquipmentCategory.CARDIO
      ],
      [EquipmentCategory.CARDIO]: [
        EquipmentCategory.CARDIO,
        EquipmentCategory.MACHINES
      ],
      [EquipmentCategory.BODYWEIGHT]: [
        EquipmentCategory.BODYWEIGHT,
        EquipmentCategory.FREE_WEIGHTS,
        EquipmentCategory.FUNCTIONAL,
        EquipmentCategory.RESISTANCE_BANDS
      ],
      [EquipmentCategory.RESISTANCE_BANDS]: [
        EquipmentCategory.RESISTANCE_BANDS,
        EquipmentCategory.BODYWEIGHT,
        EquipmentCategory.FUNCTIONAL,
        EquipmentCategory.REHABILITATION
      ],
      [EquipmentCategory.REHABILITATION]: [
        EquipmentCategory.REHABILITATION,
        EquipmentCategory.RESISTANCE_BANDS,
        EquipmentCategory.FUNCTIONAL
      ],
      [EquipmentCategory.FUNCTIONAL]: [
        EquipmentCategory.FUNCTIONAL,
        EquipmentCategory.FREE_WEIGHTS,
        EquipmentCategory.BODYWEIGHT,
        EquipmentCategory.RESISTANCE_BANDS,
        EquipmentCategory.REHABILITATION
      ]
    };

    return compatibilityMatrix[category] ?? [category];
  }

  // Check if two equipment categories are compatible
  private areCategoriesCompatible(category1: EquipmentCategory, category2: EquipmentCategory): boolean {
    const compatible = this.getCompatibleCategories(category1);
    return compatible.includes(category2);
  }

  // Find substitute equipment when original is unavailable
  async findSubstituteEquipment(
    originalEquipmentId: Types.ObjectId,
    organizationId: Types.ObjectId
  ): Promise<readonly Equipment[]> {
    const original = await this.equipmentRepository.findById(originalEquipmentId);
    if (!original) {
      return [];
    }

    // Get all equipment in the organization
    const allEquipment = await this.equipmentRepository.findByOrganization(organizationId);

    // Filter for available equipment in compatible categories
    const compatibleCategories = this.getCompatibleCategories(original.category);
    
    const substitutes = allEquipment.filter(equipment => 
      !equipment.id.equals(originalEquipmentId) &&
      equipment.isEquipmentAvailable() &&
      compatibleCategories.includes(equipment.category)
    );

    // Score and sort substitutes
    const scoredSubstitutes = substitutes.map(sub => ({
      equipment: sub,
      score: this.calculateSimilarityScore(original, sub)
    }));

    return scoredSubstitutes
      .toSorted((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.equipment);
  }

  // Validate workout equipment requirements
  async validateWorkoutEquipment(
    exerciseIds: readonly Types.ObjectId[],
    availableEquipment: readonly Types.ObjectId[]
  ): Promise<{
    valid: boolean;
    missingEquipment: readonly string[];
    suggestions: readonly string[];
    warnings: readonly string[];
  }> {
    const missingEquipment: string[] = [];
    const suggestions: string[] = [];
    const warnings: string[] = [];

    for (const exerciseId of exerciseIds) {
      const validation = await this.validateEquipmentRequirements(exerciseId, availableEquipment);
      
      if (!validation.isValid) {
        missingEquipment.push(...validation.errors);
      }
      
      suggestions.push(...validation.suggestions);
      warnings.push(...validation.warnings);
    }

    return {
      valid: missingEquipment.length === 0,
      missingEquipment,
      suggestions,
      warnings
    };
  }
}
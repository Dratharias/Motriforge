import { Types } from 'mongoose';
import { 
  ExerciseType, 
  Difficulty, 
  MuscleZone 
} from '../../../types/fitness/enums/exercise';
import { 
  ContraindicationType, 
  ContraindicationSeverity,
  IContraindication 
} from '../interfaces/ExerciseInterfaces';

/**
 * Exercise safety guidelines and contraindication management
 */
export class SafetyGuidelines {
  /**
   * Get default contraindications for exercise types
   */
  static getDefaultContraindications(exerciseType: ExerciseType): readonly IContraindication[] {
    const baseContraindications: Record<ExerciseType, IContraindication[]> = {
      [ExerciseType.STRENGTH]: [
        {
          id: new Types.ObjectId(),
          type: ContraindicationType.MEDICAL,
          severity: ContraindicationSeverity.ABSOLUTE,
          conditions: ['Acute heart conditions', 'Uncontrolled hypertension'],
          description: 'High-intensity strength training may be dangerous for those with cardiovascular conditions',
          alternatives: []
        }
      ],
      [ExerciseType.CARDIO]: [
        {
          id: new Types.ObjectId(),
          type: ContraindicationType.MEDICAL,
          severity: ContraindicationSeverity.ABSOLUTE,
          conditions: ['Acute cardiac conditions', 'Severe respiratory conditions'],
          description: 'Cardiovascular exercise may exacerbate heart and lung conditions',
          alternatives: []
        }
      ],
      [ExerciseType.FLEXIBILITY]: [
        {
          id: new Types.ObjectId(),
          type: ContraindicationType.INJURY,
          severity: ContraindicationSeverity.RELATIVE,
          conditions: ['Acute muscle strains', 'Joint inflammation'],
          description: 'Stretching injured areas may worsen condition',
          alternatives: []
        }
      ],
      [ExerciseType.BALANCE]: [
        {
          id: new Types.ObjectId(),
          type: ContraindicationType.MEDICAL,
          severity: ContraindicationSeverity.RELATIVE,
          conditions: ['Vestibular disorders', 'Recent falls'],
          description: 'Balance exercises may increase fall risk for those with balance disorders',
          alternatives: []
        }
      ],
      [ExerciseType.ENDURANCE]: [
        {
          id: new Types.ObjectId(),
          type: ContraindicationType.MEDICAL,
          severity: ContraindicationSeverity.RELATIVE,
          conditions: ['Chronic fatigue syndrome', 'Severe anemia'],
          description: 'Extended endurance activities may worsen fatigue conditions',
          alternatives: []
        }
      ],
      [ExerciseType.REHABILITATION]: [
        {
          id: new Types.ObjectId(),
          type: ContraindicationType.MEDICAL,
          severity: ContraindicationSeverity.ABSOLUTE,
          conditions: ['Without medical supervision'],
          description: 'Rehabilitation exercises should only be performed under professional guidance',
          alternatives: []
        }
      ],
      [ExerciseType.FUNCTIONAL]: [],
      [ExerciseType.SPORTS_SPECIFIC]: [
        {
          id: new Types.ObjectId(),
          type: ContraindicationType.INJURY,
          severity: ContraindicationSeverity.RELATIVE,
          conditions: ['Sport-specific injuries', 'Overuse injuries'],
          description: 'Sport-specific movements may aggravate related injuries',
          alternatives: []
        }
      ]
    };

    return baseContraindications[exerciseType] ?? [];
  }

  /**
   * Get muscle-specific contraindications
   */
  static getMuscleContraindications(muscle: MuscleZone): readonly string[] {
    const muscleContraindications: Record<MuscleZone, string[]> = {
      [MuscleZone.NECK]: [
        'Cervical spine injuries',
        'Recent whiplash',
        'Cervical disc herniation'
      ],
      [MuscleZone.SHOULDER]: [
        'Rotator cuff tears',
        'Shoulder impingement',
        'Recent shoulder dislocation',
        'Frozen shoulder'
      ],
      [MuscleZone.BACK]: [
        'Lumbar disc herniation',
        'Acute lower back pain',
        'Spinal stenosis',
        'Recent back surgery'
      ],
      [MuscleZone.KNEE]: [
        'ACL/MCL tears',
        'Meniscus injuries',
        'Acute knee pain',
        'Recent knee surgery'
      ],
      [MuscleZone.ANKLE]: [
        'Acute ankle sprains',
        'Achilles tendon injuries',
        'Plantar fasciitis',
        'Recent ankle fractures'
      ],
      [MuscleZone.HIP]: [
        'Hip impingement',
        'Hip labral tears',
        'Recent hip replacement',
        'Acute hip bursitis'
      ],
      [MuscleZone.CHEST]: [
        'Recent chest surgery',
        'Pectoral muscle strains',
        'Costochondritis'
      ],
      [MuscleZone.ABS]: [
        'Acute abdominal pain',
        'Recent abdominal surgery',
        'Diastasis recti',
        'Hernias'
      ],
      [MuscleZone.BICEPS]: [
        'Bicep tendon tears',
        'Acute arm injuries'
      ],
      [MuscleZone.TRICEPS]: [
        'Tricep tendon injuries',
        'Elbow impingement'
      ],
      [MuscleZone.FOREARM]: [
        'Tennis elbow',
        'Golfer\'s elbow',
        'Carpal tunnel syndrome',
        'Recent wrist injuries'
      ],
      [MuscleZone.GLUTES]: [
        'Piriformis syndrome',
        'Acute hip pain',
        'Sacroiliac joint dysfunction'
      ],
      [MuscleZone.QUADRICEPS]: [
        'Quad strains',
        'Knee instability',
        'Patellofemoral pain syndrome'
      ],
      [MuscleZone.HAMSTRINGS]: [
        'Hamstring strains',
        'Acute posterior thigh pain',
        'Sciatic nerve irritation'
      ],
      [MuscleZone.CALF]: [
        'Calf strains',
        'Achilles tendinitis',
        'Deep vein thrombosis'
      ],
      [MuscleZone.CORE]: [
        'Acute abdominal pain',
        'Recent core surgery',
        'Severe diastasis recti'
      ]
    };

    return muscleContraindications[muscle] ?? [];
  }

  /**
   * Get age-specific safety guidelines
   */
  static getAgeSpecificGuidelines(age: number): readonly string[] {
    if (age < 16) {
      return [
        'Adult supervision required',
        'Focus on bodyweight exercises',
        'Avoid heavy resistance training',
        'Emphasize proper form over intensity',
        'Limit session duration to 30-45 minutes',
        'Ensure adequate rest between sessions'
      ];
    }

    if (age >= 65) {
      return [
        'Medical clearance recommended',
        'Start with low-intensity exercises',
        'Focus on balance and fall prevention',
        'Monitor blood pressure during exercise',
        'Ensure proper warm-up and cool-down',
        'Consider exercise buddy system',
        'Have emergency contact readily available'
      ];
    }

    return [
      'Follow proper warm-up protocols',
      'Stay hydrated throughout exercise',
      'Listen to your body and stop if experiencing pain',
      'Progress gradually in intensity and duration'
    ];
  }

  /**
   * Get difficulty-specific safety warnings
   */
  static getDifficultyWarnings(difficulty: Difficulty): readonly string[] {
    const warnings: Record<Difficulty, string[]> = {
      [Difficulty.BEGINNER_I]: [
        'Focus on learning proper form',
        'Start with shorter durations',
        'Use lighter weights or bodyweight only'
      ],
      [Difficulty.BEGINNER_II]: [
        'Ensure mastery of basic movements',
        'Gradually increase intensity',
        'Pay attention to body alignment'
      ],
      [Difficulty.BEGINNER_III]: [
        'Consider working with a trainer',
        'Don\'t rush progression',
        'Maintain consistent form under fatigue'
      ],
      [Difficulty.INTERMEDIATE_I]: [
        'Proper progression from beginner level required',
        'Increased injury risk with poor form',
        'Monitor fatigue levels closely'
      ],
      [Difficulty.INTERMEDIATE_II]: [
        'Advanced movement patterns require practice',
        'Consider deload weeks',
        'Ensure adequate recovery between sessions'
      ],
      [Difficulty.INTERMEDIATE_III]: [
        'High skill and strength requirements',
        'Risk of overuse injuries increases',
        'Professional guidance recommended'
      ],
      [Difficulty.ADVANCED_I]: [
        'Significant training experience required',
        'High injury risk without proper preparation',
        'Excellent form essential under high loads'
      ],
      [Difficulty.ADVANCED_II]: [
        'Elite-level movement patterns',
        'Requires specialized coaching',
        'Comprehensive warm-up critical'
      ],
      [Difficulty.ADVANCED_III]: [
        'Maximum effort exercises',
        'Spotter or supervision essential',
        'Perfect technique mandatory'
      ],
      [Difficulty.MASTER]: [
        'Expert-level exercise',
        'Years of training required',
        'Professional supervision mandatory',
        'Extensive injury prevention protocols needed'
      ]
    };

    return warnings[difficulty] ?? [];
  }

  /**
   * Check if exercise requires medical clearance
   */
  static requiresMedicalClearance(
    exerciseType: ExerciseType,
    difficulty: Difficulty,
    userAge?: number,
    medicalConditions?: readonly string[]
  ): boolean {
    // High-risk exercise types
    if ([ExerciseType.REHABILITATION].includes(exerciseType)) {
      return true;
    }

    // Advanced difficulty levels
    if ([Difficulty.ADVANCED_II, Difficulty.ADVANCED_III, Difficulty.MASTER].includes(difficulty)) {
      return true;
    }

    // Age-based requirements
    if (userAge && (userAge < 16 || userAge > 65)) {
      return true;
    }

    // Medical condition requirements
    if (medicalConditions && medicalConditions.length > 0) {
      const highRiskConditions = [
        'Heart disease',
        'Hypertension',
        'Diabetes',
        'Recent surgery',
        'Chronic pain conditions'
      ];
      
      return medicalConditions.some(condition =>
        highRiskConditions.some(riskCondition =>
          condition.toLowerCase().includes(riskCondition.toLowerCase())
        )
      );
    }

    return false;
  }

  /**
   * Get emergency procedures for exercise type
   */
  static getEmergencyProcedures(exerciseType: ExerciseType): readonly string[] {
    const procedures: Record<ExerciseType, string[]> = {
      [ExerciseType.STRENGTH]: [
        'Stop exercise immediately if experiencing chest pain',
        'Lower weights safely if feeling dizzy',
        'Call for help if unable to move safely',
        'Apply ice to acute injuries'
      ],
      [ExerciseType.CARDIO]: [
        'Stop and rest if experiencing chest pain or shortness of breath',
        'Sit down if feeling lightheaded',
        'Monitor heart rate if available',
        'Seek immediate medical attention for chest pain'
      ],
      [ExerciseType.FLEXIBILITY]: [
        'Stop stretching if experiencing sharp pain',
        'Apply ice to overstretched areas',
        'Avoid bouncing or forcing movements'
      ],
      [ExerciseType.BALANCE]: [
        'Use support if feeling unsteady',
        'Clear area of obstacles before starting',
        'Have someone nearby during challenging balance exercises'
      ],
      [ExerciseType.ENDURANCE]: [
        'Hydrate regularly during long sessions',
        'Stop if experiencing heat exhaustion symptoms',
        'Monitor for signs of overexertion'
      ],
      [ExerciseType.REHABILITATION]: [
        'Stop immediately if pain increases',
        'Contact healthcare provider for guidance',
        'Document any adverse reactions'
      ],
      [ExerciseType.FUNCTIONAL]: [
        'Ensure proper movement mechanics',
        'Stop if compensatory patterns develop',
        'Progress gradually to avoid overuse'
      ],
      [ExerciseType.SPORTS_SPECIFIC]: [
        'Use proper protective equipment',
        'Warm up thoroughly before high-intensity movements',
        'Cool down properly after sessions'
      ]
    };

    return procedures[exerciseType] ?? [
      'Stop exercise if experiencing pain or discomfort',
      'Seek medical attention if symptoms persist',
      'Rest and hydrate after sessions'
    ];
  }

  /**
   * Validate exercise safety
   */
  static validateExerciseSafety(
    exerciseType: ExerciseType,
    difficulty: Difficulty,
    targetMuscles: readonly MuscleZone[],
    userAge?: number,
    medicalConditions?: readonly string[]
  ): {
    isSafe: boolean;
    warnings: readonly string[];
    contraindications: readonly string[];
    requiresMedicalClearance: boolean;
  } {
    const warnings: string[] = [];
    const contraindications: string[] = [];

    // Add difficulty warnings
    warnings.push(...this.getDifficultyWarnings(difficulty));

    // Add age-specific guidelines
    if (userAge) {
      warnings.push(...this.getAgeSpecificGuidelines(userAge));
    }

    // Add muscle-specific contraindications
    for (const muscle of targetMuscles) {
      contraindications.push(...this.getMuscleContraindications(muscle));
    }

    // Check medical clearance requirement
    const requiresMedicalClearance = this.requiresMedicalClearance(
      exerciseType,
      difficulty,
      userAge,
      medicalConditions
    );

    // Determine overall safety
    const hasHighRiskFactors = contraindications.length > 3 || requiresMedicalClearance;
    const isSafe = !hasHighRiskFactors || (medicalConditions?.length ?? 0) === 0;

    return {
      isSafe,
      warnings,
      contraindications,
      requiresMedicalClearance
    };
  }
}
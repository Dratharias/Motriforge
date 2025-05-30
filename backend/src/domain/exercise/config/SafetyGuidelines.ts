import { ExerciseType, Difficulty, MuscleZone } from '../../../types/fitness/enums/exercise';

export class SafetyGuidelines {
  private static readonly HIGH_RISK_EXERCISE_TYPES = [
    ExerciseType.REHABILITATION,
    ExerciseType.SPORTS_SPECIFIC
  ];

  private static readonly HIGH_RISK_DIFFICULTIES = [
    Difficulty.ADVANCED_II,
    Difficulty.ADVANCED_III,
    Difficulty.MASTER
  ];

  private static readonly HIGH_RISK_MUSCLE_GROUPS = [
    MuscleZone.NECK,
    MuscleZone.BACK,
    MuscleZone.KNEE,
    MuscleZone.SHOULDER
  ];

  private static readonly MUSCLE_CONTRAINDICATIONS: Record<MuscleZone, readonly string[]> = {
    [MuscleZone.NECK]: [
      'cervical spine injuries',
      'neck pain',
      'whiplash history',
      'herniated cervical disc',
      'cervical stenosis',
      'cervical radiculopathy'
    ],
    [MuscleZone.BACK]: [
      'lower back pain',
      'herniated disc',
      'sciatica',
      'spinal stenosis',
      'spondylolisthesis',
      'recent back surgery',
      'acute back injury',
      'chronic back conditions'
    ],
    [MuscleZone.SHOULDER]: [
      'rotator cuff tear',
      'shoulder impingement',
      'frozen shoulder',
      'shoulder dislocation history',
      'acromioclavicular joint injury',
      'shoulder arthritis',
      'recent shoulder surgery'
    ],
    [MuscleZone.KNEE]: [
      'knee pain',
      'ACL injury',
      'meniscus tear',
      'patellar tendonitis',
      'knee arthritis',
      'recent knee surgery',
      'ligament injuries',
      'patellofemoral pain syndrome'
    ],
    [MuscleZone.HIP]: [
      'hip impingement',
      'hip arthritis',
      'hip flexor strain',
      'recent hip surgery',
      'hip bursitis'
    ],
    [MuscleZone.ANKLE]: [
      'ankle sprain history',
      'ankle arthritis',
      'Achilles tendonitis',
      'plantar fasciitis',
      'ankle instability'
    ],
    [MuscleZone.WRIST]: [
      'carpal tunnel syndrome',
      'wrist arthritis',
      'wrist fracture history',
      'tendonitis',
      'repetitive strain injury'
    ],
    [MuscleZone.CHEST]: [
      'recent chest surgery',
      'rib fractures',
      'chest muscle strain'
    ],
    [MuscleZone.CORE]: [
      'diastasis recti',
      'abdominal surgery',
      'hernia',
      'lower back issues'
    ],
    [MuscleZone.TRICEPS]: [
      'elbow tendonitis',
      'triceps strain',
      'elbow arthritis'
    ],
    [MuscleZone.BICEPS]: [
      'biceps tendonitis',
      'biceps rupture history',
      'elbow issues'
    ],
    [MuscleZone.FOREARM]: [
      'tennis elbow',
      'golfer\'s elbow',
      'forearm strain',
      'grip strength limitations'
    ],
    [MuscleZone.QUADRICEPS]: [
      'quadriceps strain',
      'knee issues',
      'hip flexor problems'
    ],
    [MuscleZone.HAMSTRING]: [
      'hamstring strain',
      'sciatic nerve issues',
      'tight hip flexors'
    ],
    [MuscleZone.GLUTES]: [
      'piriformis syndrome',
      'hip issues',
      'lower back problems'
    ],
    [MuscleZone.CALVES]: [
      'calf strain',
      'Achilles issues',
      'ankle problems'
    ]
  };

  private static readonly MEDICAL_CLEARANCE_CONDITIONS = [
    'cardiovascular disease',
    'uncontrolled hypertension',
    'recent cardiac event',
    'diabetes complications',
    'severe osteoporosis',
    'pregnancy complications',
    'recent major surgery',
    'chronic pain conditions',
    'neurological disorders',
    'autoimmune conditions'
  ];

  static requiresMedicalClearance(
    exerciseType: ExerciseType,
    difficulty: Difficulty
  ): boolean {
    return this.HIGH_RISK_EXERCISE_TYPES.includes(exerciseType) ||
           this.HIGH_RISK_DIFFICULTIES.includes(difficulty);
  }

  static validateExerciseSafety(
    exerciseType: ExerciseType,
    difficulty: Difficulty,
    primaryMuscles: readonly MuscleZone[],
    secondaryMuscles?: readonly MuscleZone[],
    userConditions?: readonly string[]
  ): {
    isSafe: boolean;
    warnings: readonly string[];
    contraindications: readonly string[];
    requiresMedicalClearance: boolean;
  } {
    const warnings: string[] = [];
    const contraindications: string[] = [];
    let requiresMedicalClearance = false;

    // Check exercise type risks
    if (this.HIGH_RISK_EXERCISE_TYPES.includes(exerciseType)) {
      warnings.push(`${exerciseType} exercises carry increased risk and require professional supervision`);
      requiresMedicalClearance = true;
    }

    // Check difficulty risks
    if (this.HIGH_RISK_DIFFICULTIES.includes(difficulty)) {
      warnings.push(`${difficulty} exercises require advanced skill and experience`);
    }

    // Check muscle group risks
    const allMuscles = [...primaryMuscles, ...(secondaryMuscles ?? [])];
    const highRiskMuscles = allMuscles.filter(muscle =>
      this.HIGH_RISK_MUSCLE_GROUPS.includes(muscle)
    );

    if (highRiskMuscles.length > 0) {
      warnings.push(`Exercise targets high-risk muscle groups: ${highRiskMuscles.join(', ')}`);
    }

    // Check user condition contraindications
    if (userConditions && userConditions.length > 0) {
      for (const muscle of allMuscles) {
        const muscleContraindications = this.MUSCLE_CONTRAINDICATIONS[muscle] ?? [];
        const matchingContraindications = muscleContraindications.filter(contraindication =>
          userConditions.some(condition =>
            condition.toLowerCase().includes(contraindication.toLowerCase()) ||
            contraindication.toLowerCase().includes(condition.toLowerCase())
          )
        );

        if (matchingContraindications.length > 0) {
          contraindications.push(...matchingContraindications);
        }
      }

      // Check for medical clearance conditions
      const needsClearance = userConditions.some(condition =>
        this.MEDICAL_CLEARANCE_CONDITIONS.some(clearanceCondition =>
          condition.toLowerCase().includes(clearanceCondition.toLowerCase())
        )
      );

      if (needsClearance) {
        requiresMedicalClearance = true;
        warnings.push('Medical clearance required due to existing health conditions');
      }
    }

    const uniqueContraindications = [...new Set(contraindications)];
    const isSafe = uniqueContraindications.length === 0 && !requiresMedicalClearance;

    return {
      isSafe,
      warnings,
      contraindications: uniqueContraindications,
      requiresMedicalClearance
    };
  }

  static getMuscleContraindications(muscle: MuscleZone): readonly string[] {
    return this.MUSCLE_CONTRAINDICATIONS[muscle] ?? [];
  }

  static getGeneralSafetyGuidelines(exerciseType: ExerciseType): readonly string[] {
    const guidelines: Record<ExerciseType, readonly string[]> = {
      [ExerciseType.STRENGTH]: [
        'Always warm up before starting',
        'Use proper form over heavy weight',
        'Progress gradually',
        'Allow adequate rest between sets',
        'Stop if you feel sharp pain'
      ],
      [ExerciseType.CARDIO]: [
        'Start with moderate intensity',
        'Monitor heart rate',
        'Stay hydrated',
        'Cool down properly',
        'Listen to your body'
      ],
      [ExerciseType.FLEXIBILITY]: [
        'Never stretch cold muscles',
        'Avoid bouncing movements',
        'Breathe deeply during stretches',
        'Hold stretches for adequate time',
        'Stop at mild discomfort, not pain'
      ],
      [ExerciseType.BALANCE]: [
        'Ensure safe environment',
        'Use support when needed',
        'Progress difficulty gradually',
        'Focus on proper alignment',
        'Practice regularly for improvement'
      ],
      [ExerciseType.FUNCTIONAL]: [
        'Master basic movements first',
        'Focus on quality over quantity',
        'Use appropriate resistance',
        'Maintain proper breathing',
        'Consider real-world applications'
      ],
      [ExerciseType.REHABILITATION]: [
        'Follow medical professional guidance',
        'Start very conservatively',
        'Monitor pain levels constantly',
        'Progress only with approval',
        'Report any concerning symptoms'
      ],
      [ExerciseType.SPORTS_SPECIFIC]: [
        'Ensure sport-specific warm-up',
        'Use proper protective equipment',
        'Follow progressive skill development',
        'Consider fatigue levels',
        'Maintain situational awareness'
      ]
    };

    return guidelines[exerciseType] ?? [];
  }

  static getDifficultyRequirements(difficulty: Difficulty): {
    prerequisites: readonly string[];
    supervision: 'none' | 'recommended' | 'required';
    medicalClearance: boolean;
  } {
    const requirements: Record<Difficulty, {
      prerequisites: readonly string[];
      supervision: 'none' | 'recommended' | 'required';
      medicalClearance: boolean;
    }> = {
      [Difficulty.BEGINNER_I]: {
        prerequisites: [],
        supervision: 'none',
        medicalClearance: false
      },
      [Difficulty.BEGINNER_II]: {
        prerequisites: ['Basic movement competency'],
        supervision: 'none',
        medicalClearance: false
      },
      [Difficulty.BEGINNER_III]: {
        prerequisites: ['Consistent exercise routine'],
        supervision: 'none',
        medicalClearance: false
      },
      [Difficulty.INTERMEDIATE_I]: {
        prerequisites: ['3+ months regular exercise'],
        supervision: 'recommended',
        medicalClearance: false
      },
      [Difficulty.INTERMEDIATE_II]: {
        prerequisites: ['6+ months regular exercise', 'Good form foundation'],
        supervision: 'recommended',
        medicalClearance: false
      },
      [Difficulty.INTERMEDIATE_III]: {
        prerequisites: ['1+ year exercise experience', 'Advanced movement patterns'],
        supervision: 'recommended',
        medicalClearance: false
      },
      [Difficulty.ADVANCED_I]: {
        prerequisites: ['2+ years experience', 'Excellent form', 'Injury-free status'],
        supervision: 'required',
        medicalClearance: true
      },
      [Difficulty.ADVANCED_II]: {
        prerequisites: ['3+ years experience', 'Advanced programming knowledge'],
        supervision: 'required',
        medicalClearance: true
      },
      [Difficulty.ADVANCED_III]: {
        prerequisites: ['5+ years experience', 'Competitive experience'],
        supervision: 'required',
        medicalClearance: true
      },
      [Difficulty.MASTER]: {
        prerequisites: ['Expert-level competency', 'Coaching certification'],
        supervision: 'required',
        medicalClearance: true
      }
    };

    return requirements[difficulty];
  }

  static getEmergencyProcedures(): readonly string[] {
    return [
      'Stop exercise immediately if experiencing chest pain, dizziness, or difficulty breathing',
      'Apply RICE (Rest, Ice, Compression, Elevation) for acute injuries',
      'Seek immediate medical attention for severe pain or suspected fractures',
      'Have emergency contact information readily available',
      'Know location of nearest medical facility',
      'Keep first aid kit accessible during exercise sessions',
      'Ensure communication device is available for emergencies'
    ];
  }

  static getAgeSpecificGuidelines(age: number): readonly string[] {
    const guidelines: string[] = [];

    if (age < 18) {
      guidelines.push(
        'Require parental supervision and consent',
        'Focus on movement skill development',
        'Avoid heavy resistance training',
        'Emphasize fun and participation'
      );
    } else if (age >= 65) {
      guidelines.push(
        'Consider balance and fall prevention',
        'Monitor for medication interactions',
        'Progress very gradually',
        'Include functional movement patterns',
        'Consider bone density limitations'
      );
    }

    if (age >= 40) {
      guidelines.push(
        'Consider cardiovascular screening',
        'Monitor blood pressure response',
        'Include mobility and flexibility work',
        'Be aware of joint limitations'
      );
    }

    return guidelines;
  }
}
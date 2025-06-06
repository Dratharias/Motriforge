import { PrismaClient } from '../../shared/database/generated'
import { logger } from '../../shared/utils/logger'

const prisma = new PrismaClient()

/**
 * Database seeding script
 * Populates the database with initial foundation data
 */
async function main(): Promise<void> {
  try {
    console.log('🌱 Starting database seeding...')

    // Create system user for initial data creation
    const systemUser = await createSystemUser()
    console.log('✅ System user created')

    // Seed foundation data
    await seedVisibilityLevels(systemUser.id)
    console.log('✅ Visibility levels seeded')

    await seedDifficultyLevels(systemUser.id)
    console.log('✅ Difficulty levels seeded')

    await seedCategories(systemUser.id)
    console.log('✅ Categories seeded')

    await seedTags(systemUser.id)
    console.log('✅ Tags seeded')

    await seedMuscleGroups(systemUser.id)
    console.log('✅ Muscle groups seeded')

    await seedMuscles(systemUser.id)
    console.log('✅ Muscles seeded')

    await seedMetrics(systemUser.id)
    console.log('✅ Metrics seeded')

    await seedMediaTypes(systemUser.id)
    console.log('✅ Media types seeded')

    // TODO: Add sample equipment, exercises, workouts, programs

    console.log('🎉 Database seeding completed successfully!')
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Create system user for data creation tracking
 */
async function createSystemUser() {
  const publicVisibility = await prisma.visibility.upsert({
    where: { name: 'PUBLIC' },
    update: {},
    create: {
      name: 'PUBLIC',
      description: 'Publicly visible to all users',
      level: 0,
      createdBy: 'SYSTEM', // Temporary, will be updated after user creation
    },
  })

  return prisma.user.upsert({
    where: { email: 'system@motriforge.com' },
    update: {},
    create: {
      email: 'system@motriforge.com',
      firstName: 'System',
      lastName: 'User',
      visibilityId: publicVisibility.id,
      createdBy: 'SYSTEM', // Self-reference for system user
    },
  })
}

/**
 * Seed visibility levels
 */
async function seedVisibilityLevels(createdBy: string): Promise<void> {
  const visibilityLevels = [
    {
      name: 'PUBLIC',
      description: 'Publicly visible to all users',
      level: 0,
    },
    {
      name: 'MEMBERS',
      description: 'Visible to registered members only',
      level: 10,
    },
    {
      name: 'PREMIUM',
      description: 'Visible to premium subscribers only',
      level: 20,
    },
    {
      name: 'PRIVATE',
      description: 'Visible to owner and explicitly shared users only',
      level: 30,
    },
    {
      name: 'ADMIN',
      description: 'Visible to administrators only',
      level: 100,
    },
  ]

  await Promise.all(
    visibilityLevels.map(level =>
      prisma.visibility.upsert({
        where: { name: level.name },
        update: {},
        create: { ...level, createdBy },
      })
    )
  )
}

/**
 * Seed difficulty levels
 */
async function seedDifficultyLevels(createdBy: string): Promise<void> {
  const difficultyLevels = [
    {
      name: 'BEGINNER',
      value: 1,
      description: 'Suitable for beginners with little to no experience',
      colorCode: '#22c55e', // green
    },
    {
      name: 'NOVICE',
      value: 2,
      description: 'For those with some basic experience',
      colorCode: '#84cc16', // lime
    },
    {
      name: 'INTERMEDIATE',
      value: 3,
      description: 'Requires moderate experience and fitness level',
      colorCode: '#eab308', // yellow
    },
    {
      name: 'ADVANCED',
      value: 4,
      description: 'For experienced individuals with high fitness level',
      colorCode: '#f97316', // orange
    },
    {
      name: 'EXPERT',
      value: 5,
      description: 'Extremely challenging, for elite athletes',
      colorCode: '#dc2626', // red
    },
  ]

  await Promise.all(
    difficultyLevels.map(level =>
      prisma.difficultyLevel.upsert({
        where: { name: level.name },
        update: {},
        create: { ...level, createdBy },
      })
    )
  )
}

/**
 * Seed categories
 */
async function seedCategories(createdBy: string): Promise<void> {
  const categories = [
    // Exercise categories
    { name: 'STRENGTH', type: 'EXERCISE', description: 'Strength training exercises', path: '/strength' },
    { name: 'CARDIO', type: 'EXERCISE', description: 'Cardiovascular exercises', path: '/cardio' },
    { name: 'FLEXIBILITY', type: 'EXERCISE', description: 'Flexibility and mobility exercises', path: '/flexibility' },
    { name: 'BALANCE', type: 'EXERCISE', description: 'Balance and stability exercises', path: '/balance' },
    { name: 'PLYOMETRIC', type: 'EXERCISE', description: 'Explosive power exercises', path: '/plyometric' },
    
    // Workout categories
    { name: 'FULL_BODY', type: 'WORKOUT', description: 'Full body workouts', path: '/full-body' },
    { name: 'UPPER_BODY', type: 'WORKOUT', description: 'Upper body focused workouts', path: '/upper-body' },
    { name: 'LOWER_BODY', type: 'WORKOUT', description: 'Lower body focused workouts', path: '/lower-body' },
    { name: 'CORE', type: 'WORKOUT', description: 'Core strengthening workouts', path: '/core' },
    { name: 'HIIT', type: 'WORKOUT', description: 'High-intensity interval training', path: '/hiit' },
    
    // Program categories
    { name: 'MUSCLE_BUILDING', type: 'PROGRAM', description: 'Muscle building programs', path: '/muscle-building' },
    { name: 'WEIGHT_LOSS', type: 'PROGRAM', description: 'Weight loss programs', path: '/weight-loss' },
    { name: 'ENDURANCE', type: 'PROGRAM', description: 'Endurance training programs', path: '/endurance' },
    { name: 'REHABILITATION', type: 'PROGRAM', description: 'Rehabilitation programs', path: '/rehabilitation' },
    
    // Equipment categories
    { name: 'FREE_WEIGHTS', type: 'EQUIPMENT', description: 'Free weight equipment', path: '/free-weights' },
    { name: 'MACHINES', type: 'EQUIPMENT', description: 'Exercise machines', path: '/machines' },
    { name: 'BODYWEIGHT', type: 'EQUIPMENT', description: 'No equipment needed', path: '/bodyweight' },
    { name: 'ACCESSORIES', type: 'EQUIPMENT', description: 'Fitness accessories', path: '/accessories' },
  ]

  await Promise.all(
    categories.map(category =>
      prisma.category.upsert({
        where: { name: category.name },
        update: {},
        create: { ...category, createdBy },
      })
    )
  )
}

/**
 * Seed tags
 */
async function seedTags(createdBy: string): Promise<void> {
  const tags = [
    // Exercise tags
    { name: 'COMPOUND', type: 'EXERCISE', description: 'Multi-joint exercises' },
    { name: 'ISOLATION', type: 'EXERCISE', description: 'Single-joint exercises' },
    { name: 'UNILATERAL', type: 'EXERCISE', description: 'Single-limb exercises' },
    { name: 'EXPLOSIVE', type: 'EXERCISE', description: 'Explosive movement exercises' },
    { name: 'ISOMETRIC', type: 'EXERCISE', description: 'Static hold exercises' },
    
    // Workout tags
    { name: 'QUICK', type: 'WORKOUT', description: 'Quick workouts under 30 minutes' },
    { name: 'INTENSE', type: 'WORKOUT', description: 'High intensity workouts' },
    { name: 'BEGINNER_FRIENDLY', type: 'WORKOUT', description: 'Suitable for beginners' },
    { name: 'NO_EQUIPMENT', type: 'WORKOUT', description: 'No equipment required' },
    { name: 'HOME', type: 'WORKOUT', description: 'Can be done at home' },
    
    // Program tags
    { name: '30_DAY', type: 'PROGRAM', description: '30-day programs' },
    { name: '12_WEEK', type: 'PROGRAM', description: '12-week programs' },
    { name: 'PROGRESSIVE', type: 'PROGRAM', description: 'Progressive overload programs' },
    { name: 'PERIODIZED', type: 'PROGRAM', description: 'Periodized training programs' },
    
    // General tags
    { name: 'FEATURED', type: 'GENERAL', description: 'Featured content', isSystem: true },
    { name: 'POPULAR', type: 'GENERAL', description: 'Popular content', isSystem: true },
    { name: 'NEW', type: 'GENERAL', description: 'Newly added content', isSystem: true },
  ]

  await Promise.all(
    tags.map(tag =>
      prisma.tag.upsert({
        where: { name: tag.name },
        update: {},
        create: { ...tag, createdBy },
      })
    )
  )
}

/**
 * Seed muscle groups
 */
async function seedMuscleGroups(createdBy: string): Promise<void> {
  const muscleGroups = [
    { name: 'CHEST', description: 'Pectoral muscles' },
    { name: 'BACK', description: 'Back muscles including lats, rhomboids, and traps' },
    { name: 'SHOULDERS', description: 'Deltoid muscles' },
    { name: 'ARMS', description: 'Biceps, triceps, and forearms' },
    { name: 'CORE', description: 'Abdominals and core stabilizers' },
    { name: 'LEGS', description: 'Quadriceps, hamstrings, and calves' },
    { name: 'GLUTES', description: 'Gluteal muscles' },
  ]

  await Promise.all(
    muscleGroups.map(group =>
      prisma.muscleGroup.upsert({
        where: { name: group.name },
        update: {},
        create: { ...group, createdBy },
      })
    )
  )
}

/**
 * Seed muscles
 */
async function seedMuscles(createdBy: string): Promise<void> {
  // Get muscle groups for references
  const muscleGroups = await prisma.muscleGroup.findMany()
  const getGroupId = (name: string) => muscleGroups.find(g => g.name === name)?.id!

  const muscles = [
    // Chest muscles
    { name: 'Pectoralis Major', scientificName: 'Pectoralis major', muscleGroupId: getGroupId('CHEST') },
    { name: 'Pectoralis Minor', scientificName: 'Pectoralis minor', muscleGroupId: getGroupId('CHEST') },
    
    // Back muscles
    { name: 'Latissimus Dorsi', scientificName: 'Latissimus dorsi', muscleGroupId: getGroupId('BACK') },
    { name: 'Rhomboids', scientificName: 'Rhomboideus major & minor', muscleGroupId: getGroupId('BACK') },
    { name: 'Trapezius', scientificName: 'Trapezius', muscleGroupId: getGroupId('BACK') },
    { name: 'Erector Spinae', scientificName: 'Erector spinae', muscleGroupId: getGroupId('BACK') },
    
    // Shoulder muscles
    { name: 'Anterior Deltoid', scientificName: 'Deltoideus anterior', muscleGroupId: getGroupId('SHOULDERS') },
    { name: 'Medial Deltoid', scientificName: 'Deltoideus medius', muscleGroupId: getGroupId('SHOULDERS') },
    { name: 'Posterior Deltoid', scientificName: 'Deltoideus posterior', muscleGroupId: getGroupId('SHOULDERS') },
    
    // Arm muscles
    { name: 'Biceps Brachii', scientificName: 'Biceps brachii', muscleGroupId: getGroupId('ARMS') },
    { name: 'Triceps Brachii', scientificName: 'Triceps brachii', muscleGroupId: getGroupId('ARMS') },
    { name: 'Forearm Flexors', scientificName: 'Flexor carpi group', muscleGroupId: getGroupId('ARMS') },
    { name: 'Forearm Extensors', scientificName: 'Extensor carpi group', muscleGroupId: getGroupId('ARMS') },
    
    // Core muscles
    { name: 'Rectus Abdominis', scientificName: 'Rectus abdominis', muscleGroupId: getGroupId('CORE') },
    { name: 'External Obliques', scientificName: 'Obliquus externus abdominis', muscleGroupId: getGroupId('CORE') },
    { name: 'Internal Obliques', scientificName: 'Obliquus internus abdominis', muscleGroupId: getGroupId('CORE') },
    { name: 'Transverse Abdominis', scientificName: 'Transversus abdominis', muscleGroupId: getGroupId('CORE') },
    
    // Leg muscles
    { name: 'Quadriceps', scientificName: 'Quadriceps femoris', muscleGroupId: getGroupId('LEGS') },
    { name: 'Hamstrings', scientificName: 'Biceps femoris, Semitendinosus, Semimembranosus', muscleGroupId: getGroupId('LEGS') },
    { name: 'Calves', scientificName: 'Gastrocnemius & Soleus', muscleGroupId: getGroupId('LEGS') },
    { name: 'Tibialis Anterior', scientificName: 'Tibialis anterior', muscleGroupId: getGroupId('LEGS') },
    
    // Glute muscles
    { name: 'Gluteus Maximus', scientificName: 'Gluteus maximus', muscleGroupId: getGroupId('GLUTES') },
    { name: 'Gluteus Medius', scientificName: 'Gluteus medius', muscleGroupId: getGroupId('GLUTES') },
    { name: 'Gluteus Minimus', scientificName: 'Gluteus minimus', muscleGroupId: getGroupId('GLUTES') },
  ]

  await Promise.all(
    muscles.map(muscle =>
      prisma.muscle.upsert({
        where: { 
          name_muscleGroupId: { 
            name: muscle.name, 
            muscleGroupId: muscle.muscleGroupId 
          }
        },
        update: {},
        create: { ...muscle, createdBy },
      })
    )
  )
}

/**
 * Seed metrics
 */
async function seedMetrics(createdBy: string): Promise<void> {
  const metrics = [
    { name: 'WEIGHT', unit: 'kg', dataType: 'DECIMAL', description: 'Body weight' },
    { name: 'HEIGHT', unit: 'cm', dataType: 'DECIMAL', description: 'Height' },
    { name: 'BODY_FAT_PERCENTAGE', unit: '%', dataType: 'DECIMAL', description: 'Body fat percentage' },
    { name: 'MUSCLE_MASS', unit: 'kg', dataType: 'DECIMAL', description: 'Muscle mass' },
    { name: 'BMI', unit: 'kg/m²', dataType: 'DECIMAL', description: 'Body Mass Index' },
    { name: 'WAIST_CIRCUMFERENCE', unit: 'cm', dataType: 'DECIMAL', description: 'Waist circumference' },
    { name: 'CHEST_CIRCUMFERENCE', unit: 'cm', dataType: 'DECIMAL', description: 'Chest circumference' },
    { name: 'ARM_CIRCUMFERENCE', unit: 'cm', dataType: 'DECIMAL', description: 'Arm circumference' },
    { name: 'THIGH_CIRCUMFERENCE', unit: 'cm', dataType: 'DECIMAL', description: 'Thigh circumference' },
    { name: 'RESTING_HEART_RATE', unit: 'bpm', dataType: 'NUMBER', description: 'Resting heart rate' },
    { name: 'MAX_HEART_RATE', unit: 'bpm', dataType: 'NUMBER', description: 'Maximum heart rate' },
    { name: 'BLOOD_PRESSURE_SYSTOLIC', unit: 'mmHg', dataType: 'NUMBER', description: 'Systolic blood pressure' },
    { name: 'BLOOD_PRESSURE_DIASTOLIC', unit: 'mmHg', dataType: 'NUMBER', description: 'Diastolic blood pressure' },
  ]

  await Promise.all(
    metrics.map(metric =>
      prisma.metric.upsert({
        where: { name: metric.name },
        update: {},
        create: { ...metric, createdBy },
      })
    )
  )
}

/**
 * Seed media types
 */
async function seedMediaTypes(createdBy: string): Promise<void> {
  const mediaTypes = [
    {
      name: 'IMAGE',
      description: 'Image files for thumbnails and demonstrations',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
    },
    {
      name: 'VIDEO',
      description: 'Video files for exercise demonstrations',
      allowedMimeTypes: ['video/mp4', 'video/webm', 'video/avi', 'video/mov'],
      maxFileSizeBytes: 100 * 1024 * 1024, // 100MB
    },
    {
      name: 'AUDIO',
      description: 'Audio files for workout guidance',
      allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
      maxFileSizeBytes: 50 * 1024 * 1024, // 50MB
    },
    {
      name: 'DOCUMENT',
      description: 'Document files for workout plans and guides',
      allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      maxFileSizeBytes: 25 * 1024 * 1024, // 25MB
    },
  ]

  await Promise.all(
    mediaTypes.map(type =>
      prisma.mediaType.upsert({
        where: { name: type.name },
        update: {},
        create: { ...type, createdBy },
      })
    )
  )
}

// Execute seeding
main()
  .catch((error) => {
    logger.error('Database seeding failed', { error })
    process.exit(1)
  })
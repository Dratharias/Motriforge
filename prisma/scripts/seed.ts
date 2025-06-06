// prisma/scripts/seed.ts
import { PrismaClient, VisibilityLevel, CategoryType, TagType, MetricDataType } from "../generated/index.js"

const prisma = new PrismaClient()

/**
 * Database seeding script
 * Populates the database with initial foundation data
 */
async function main(): Promise<void> {
  try {
    console.log("🌱 Starting database seeding...")

    // First, seed system data without user references
    await seedVisibilityLevels()
    console.log("✅ Visibility levels seeded")

    await seedDifficultyLevels()
    console.log("✅ Difficulty levels seeded")

    await seedCategories()
    console.log("✅ Categories seeded")

    await seedTags()
    console.log("✅ Tags seeded")

    await seedMuscleGroups()
    console.log("✅ Muscle groups seeded")

    await seedMuscles()
    console.log("✅ Muscles seeded")

    await seedMetrics()
    console.log("✅ Metrics seeded")

    await seedMediaTypes()
    console.log("✅ Media types seeded")

    // Create system user after foundation data exists
    const systemUser = await createSystemUser()
    console.log("✅ System user created")

    // Update system data to reference system user
    await updateSystemDataCreator(systemUser.id)
    console.log("✅ System data updated with creator")

    console.log("🎉 Database seeding completed successfully!")
    
  } catch (error) {
    console.error("❌ Database seeding failed:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Seed visibility levels (without creator initially)
 */
async function seedVisibilityLevels(): Promise<void> {
  const visibilityLevels = [
    {
      name: VisibilityLevel.PUBLIC,
      description: "Publicly visible to all users",
      level: 0,
    },
    {
      name: VisibilityLevel.MEMBERS,
      description: "Visible to registered members only",
      level: 10,
    },
    {
      name: VisibilityLevel.PREMIUM,
      description: "Visible to premium subscribers only",
      level: 20,
    },
    {
      name: VisibilityLevel.PRIVATE,
      description: "Visible to owner and explicitly shared users only",
      level: 30,
    },
    {
      name: VisibilityLevel.ADMIN,
      description: "Visible to administrators only",
      level: 100,
    },
  ] as const

  await Promise.all(
    visibilityLevels.map(level =>
      prisma.visibility.upsert({
        where: { name: level.name },
        update: {},
        create: level,
      })
    )
  )
}

/**
 * Seed difficulty levels (without creator initially)
 */
async function seedDifficultyLevels(): Promise<void> {
  const difficultyLevels = [
    {
      name: "BEGINNER",
      value: 1,
      description: "Suitable for beginners with little to no experience",
      colorCode: "#22c55e", // green
    },
    {
      name: "NOVICE",
      value: 2,
      description: "For those with some basic experience",
      colorCode: "#84cc16", // lime
    },
    {
      name: "INTERMEDIATE",
      value: 3,
      description: "Requires moderate experience and fitness level",
      colorCode: "#eab308", // yellow
    },
    {
      name: "ADVANCED",
      value: 4,
      description: "For experienced individuals with high fitness level",
      colorCode: "#f97316", // orange
    },
    {
      name: "EXPERT",
      value: 5,
      description: "Extremely challenging, for elite athletes",
      colorCode: "#dc2626", // red
    },
  ] as const

  await Promise.all(
    difficultyLevels.map(level =>
      prisma.difficultyLevel.upsert({
        where: { name: level.name },
        update: {},
        create: level,
      })
    )
  )
}

/**
 * Seed categories (without creator initially)
 */
async function seedCategories(): Promise<void> {
  const categories = [
    // Exercise categories
    { name: "STRENGTH", type: CategoryType.EXERCISE, description: "Strength training exercises", path: "/strength" },
    { name: "CARDIO", type: CategoryType.EXERCISE, description: "Cardiovascular exercises", path: "/cardio" },
    { name: "FLEXIBILITY", type: CategoryType.EXERCISE, description: "Flexibility and mobility exercises", path: "/flexibility" },
    { name: "BALANCE", type: CategoryType.EXERCISE, description: "Balance and stability exercises", path: "/balance" },
    { name: "PLYOMETRIC", type: CategoryType.EXERCISE, description: "Explosive power exercises", path: "/plyometric" },
    
    // Workout categories
    { name: "FULL_BODY", type: CategoryType.WORKOUT, description: "Full body workouts", path: "/full-body" },
    { name: "UPPER_BODY", type: CategoryType.WORKOUT, description: "Upper body focused workouts", path: "/upper-body" },
    { name: "LOWER_BODY", type: CategoryType.WORKOUT, description: "Lower body focused workouts", path: "/lower-body" },
    { name: "CORE", type: CategoryType.WORKOUT, description: "Core strengthening workouts", path: "/core" },
    { name: "HIIT", type: CategoryType.WORKOUT, description: "High-intensity interval training", path: "/hiit" },
    
    // Program categories
    { name: "MUSCLE_BUILDING", type: CategoryType.PROGRAM, description: "Muscle building programs", path: "/muscle-building" },
    { name: "WEIGHT_LOSS", type: CategoryType.PROGRAM, description: "Weight loss programs", path: "/weight-loss" },
    { name: "ENDURANCE", type: CategoryType.PROGRAM, description: "Endurance training programs", path: "/endurance" },
    { name: "REHABILITATION", type: CategoryType.PROGRAM, description: "Rehabilitation programs", path: "/rehabilitation" },
    
    // Equipment categories
    { name: "FREE_WEIGHTS", type: CategoryType.EQUIPMENT, description: "Free weight equipment", path: "/free-weights" },
    { name: "MACHINES", type: CategoryType.EQUIPMENT, description: "Exercise machines", path: "/machines" },
    { name: "BODYWEIGHT", type: CategoryType.EQUIPMENT, description: "No equipment needed", path: "/bodyweight" },
    { name: "ACCESSORIES", type: CategoryType.EQUIPMENT, description: "Fitness accessories", path: "/accessories" },
  ] as const

  await Promise.all(
    categories.map(category =>
      prisma.category.upsert({
        where: { name: category.name },
        update: {},
        create: category,
      })
    )
  )
}

/**
 * Seed tags (without creator initially)
 */
async function seedTags(): Promise<void> {
  const tags = [
    // Exercise tags
    { name: "COMPOUND", type: TagType.EXERCISE, description: "Multi-joint exercises" },
    { name: "ISOLATION", type: TagType.EXERCISE, description: "Single-joint exercises" },
    { name: "UNILATERAL", type: TagType.EXERCISE, description: "Single-limb exercises" },
    { name: "EXPLOSIVE", type: TagType.EXERCISE, description: "Explosive movement exercises" },
    { name: "ISOMETRIC", type: TagType.EXERCISE, description: "Static hold exercises" },
    
    // Workout tags
    { name: "QUICK", type: TagType.WORKOUT, description: "Quick workouts under 30 minutes" },
    { name: "INTENSE", type: TagType.WORKOUT, description: "High intensity workouts" },
    { name: "BEGINNER_FRIENDLY", type: TagType.WORKOUT, description: "Suitable for beginners" },
    { name: "NO_EQUIPMENT", type: TagType.WORKOUT, description: "No equipment required" },
    { name: "HOME", type: TagType.WORKOUT, description: "Can be done at home" },
    
    // Program tags
    { name: "30_DAY", type: TagType.PROGRAM, description: "30-day programs" },
    { name: "12_WEEK", type: TagType.PROGRAM, description: "12-week programs" },
    { name: "PROGRESSIVE", type: TagType.PROGRAM, description: "Progressive overload programs" },
    { name: "PERIODIZED", type: TagType.PROGRAM, description: "Periodized training programs" },
    
    // General tags
    { name: "FEATURED", type: TagType.GENERAL, description: "Featured content", isSystem: true },
    { name: "POPULAR", type: TagType.GENERAL, description: "Popular content", isSystem: true },
    { name: "NEW", type: TagType.GENERAL, description: "Newly added content", isSystem: true },
  ] as const

  await Promise.all(
    tags.map(tag =>
      prisma.tag.upsert({
        where: { name: tag.name },
        update: {},
        create: tag,
      })
    )
  )
}

/**
 * Seed muscle groups (without creator initially)
 */
async function seedMuscleGroups(): Promise<void> {
  const muscleGroups = [
    { name: "CHEST", description: "Pectoral muscles" },
    { name: "BACK", description: "Back muscles including lats, rhomboids, and traps" },
    { name: "SHOULDERS", description: "Deltoid muscles" },
    { name: "ARMS", description: "Biceps, triceps, and forearms" },
    { name: "CORE", description: "Abdominals and core stabilizers" },
    { name: "LEGS", description: "Quadriceps, hamstrings, and calves" },
    { name: "GLUTES", description: "Gluteal muscles" },
  ] as const

  await Promise.all(
    muscleGroups.map(group =>
      prisma.muscleGroup.upsert({
        where: { name: group.name },
        update: {},
        create: group,
      })
    )
  )
}

/**
 * Seed muscles (without creator initially)
 */
async function seedMuscles(): Promise<void> {
  // Get muscle groups for references
  const muscleGroups = await prisma.muscleGroup.findMany()
  const getGroupId = (name: string): string => {
    const group = muscleGroups.find((g: { name: string }) => g.name === name)
    if (!group) {
      throw new Error(`Muscle group ${name} not found`)
    }
    return group.id
  }

  const muscles = [
    // Chest muscles
    { name: "Pectoralis Major", scientificName: "Pectoralis major", muscleGroupId: getGroupId("CHEST") },
    { name: "Pectoralis Minor", scientificName: "Pectoralis minor", muscleGroupId: getGroupId("CHEST") },
    
    // Back muscles
    { name: "Latissimus Dorsi", scientificName: "Latissimus dorsi", muscleGroupId: getGroupId("BACK") },
    { name: "Rhomboids", scientificName: "Rhomboideus major & minor", muscleGroupId: getGroupId("BACK") },
    { name: "Trapezius", scientificName: "Trapezius", muscleGroupId: getGroupId("BACK") },
    { name: "Erector Spinae", scientificName: "Erector spinae", muscleGroupId: getGroupId("BACK") },
    
    // Shoulder muscles
    { name: "Anterior Deltoid", scientificName: "Deltoideus anterior", muscleGroupId: getGroupId("SHOULDERS") },
    { name: "Medial Deltoid", scientificName: "Deltoideus medius", muscleGroupId: getGroupId("SHOULDERS") },
    { name: "Posterior Deltoid", scientificName: "Deltoideus posterior", muscleGroupId: getGroupId("SHOULDERS") },
    
    // Arm muscles
    { name: "Biceps Brachii", scientificName: "Biceps brachii", muscleGroupId: getGroupId("ARMS") },
    { name: "Triceps Brachii", scientificName: "Triceps brachii", muscleGroupId: getGroupId("ARMS") },
    { name: "Forearm Flexors", scientificName: "Flexor carpi group", muscleGroupId: getGroupId("ARMS") },
    { name: "Forearm Extensors", scientificName: "Extensor carpi group", muscleGroupId: getGroupId("ARMS") },
    
    // Core muscles
    { name: "Rectus Abdominis", scientificName: "Rectus abdominis", muscleGroupId: getGroupId("CORE") },
    { name: "External Obliques", scientificName: "Obliquus externus abdominis", muscleGroupId: getGroupId("CORE") },
    { name: "Internal Obliques", scientificName: "Obliquus internus abdominis", muscleGroupId: getGroupId("CORE") },
    { name: "Transverse Abdominis", scientificName: "Transversus abdominis", muscleGroupId: getGroupId("CORE") },
    
    // Leg muscles
    { name: "Quadriceps", scientificName: "Quadriceps femoris", muscleGroupId: getGroupId("LEGS") },
    { name: "Hamstrings", scientificName: "Biceps femoris, Semitendinosus, Semimembranosus", muscleGroupId: getGroupId("LEGS") },
    { name: "Calves", scientificName: "Gastrocnemius & Soleus", muscleGroupId: getGroupId("LEGS") },
    { name: "Tibialis Anterior", scientificName: "Tibialis anterior", muscleGroupId: getGroupId("LEGS") },
    
    // Glute muscles
    { name: "Gluteus Maximus", scientificName: "Gluteus maximus", muscleGroupId: getGroupId("GLUTES") },
    { name: "Gluteus Medius", scientificName: "Gluteus medius", muscleGroupId: getGroupId("GLUTES") },
    { name: "Gluteus Minimus", scientificName: "Gluteus minimus", muscleGroupId: getGroupId("GLUTES") },
  ] as const

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
        create: muscle,
      })
    )
  )
}

/**
 * Seed metrics (without creator initially)
 */
async function seedMetrics(): Promise<void> {
  const metrics = [
    { name: "WEIGHT", unit: "kg", dataType: MetricDataType.DECIMAL, description: "Body weight" },
    { name: "HEIGHT", unit: "cm", dataType: MetricDataType.DECIMAL, description: "Height" },
    { name: "BODY_FAT_PERCENTAGE", unit: "%", dataType: MetricDataType.DECIMAL, description: "Body fat percentage" },
    { name: "MUSCLE_MASS", unit: "kg", dataType: MetricDataType.DECIMAL, description: "Muscle mass" },
    { name: "BMI", unit: "kg/m²", dataType: MetricDataType.DECIMAL, description: "Body Mass Index" },
    { name: "WAIST_CIRCUMFERENCE", unit: "cm", dataType: MetricDataType.DECIMAL, description: "Waist circumference" },
    { name: "CHEST_CIRCUMFERENCE", unit: "cm", dataType: MetricDataType.DECIMAL, description: "Chest circumference" },
    { name: "ARM_CIRCUMFERENCE", unit: "cm", dataType: MetricDataType.DECIMAL, description: "Arm circumference" },
    { name: "THIGH_CIRCUMFERENCE", unit: "cm", dataType: MetricDataType.DECIMAL, description: "Thigh circumference" },
    { name: "RESTING_HEART_RATE", unit: "bpm", dataType: MetricDataType.NUMBER, description: "Resting heart rate" },
    { name: "MAX_HEART_RATE", unit: "bpm", dataType: MetricDataType.NUMBER, description: "Maximum heart rate" },
    { name: "BLOOD_PRESSURE_SYSTOLIC", unit: "mmHg", dataType: MetricDataType.NUMBER, description: "Systolic blood pressure" },
    { name: "BLOOD_PRESSURE_DIASTOLIC", unit: "mmHg", dataType: MetricDataType.NUMBER, description: "Diastolic blood pressure" },
  ] as const

  await Promise.all(
    metrics.map(metric =>
      prisma.metric.upsert({
        where: { name: metric.name },
        update: {},
        create: metric,
      })
    )
  )
}

/**
 * Seed media types (without creator initially)
 */
async function seedMediaTypes(): Promise<void> {
  const mediaTypes = [
    {
      name: "IMAGE",
      description: "Image files for thumbnails and demonstrations",
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      maxFileSizeBytes: BigInt(10 * 1024 * 1024), // 10MB
    },
    {
      name: "VIDEO",
      description: "Video files for exercise demonstrations",
      allowedMimeTypes: ["video/mp4", "video/webm", "video/avi", "video/mov"],
      maxFileSizeBytes: BigInt(100 * 1024 * 1024), // 100MB
    },
    {
      name: "AUDIO",
      description: "Audio files for workout guidance",
      allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/ogg"],
      maxFileSizeBytes: BigInt(50 * 1024 * 1024), // 50MB
    },
    {
      name: "DOCUMENT",
      description: "Document files for workout plans and guides",
      allowedMimeTypes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      maxFileSizeBytes: BigInt(25 * 1024 * 1024), // 25MB
    },
  ] as const

  await Promise.all(
    mediaTypes.map(type =>
      prisma.mediaType.upsert({
        where: { name: type.name },
        update: {},
        create: type,
      })
    )
  )
}

/**
 * Create system user for data creation tracking
 */
async function createSystemUser() {
  const publicVisibility = await prisma.visibility.findFirst({
    where: { name: VisibilityLevel.PUBLIC },
  })

  if (!publicVisibility) {
    throw new Error("Public visibility level not found")
  }

  return prisma.user.upsert({
    where: { email: "system@motriforge.com" },
    update: {},
    create: {
      email: "system@motriforge.com",
      firstName: "System",
      lastName: "User",
      visibilityId: publicVisibility.id,
      // createdBy will be null (system user created by system)
    },
  })
}

/**
 * Update system data to reference the system user as creator
 */
async function updateSystemDataCreator(systemUserId: string): Promise<void> {
  try {
    // Update visibility levels
    await prisma.visibility.updateMany({
      where: { createdBy: null },
      data: { createdBy: systemUserId },
    })

    // Update difficulty levels
    await prisma.difficultyLevel.updateMany({
      where: { createdBy: null },
      data: { createdBy: systemUserId },
    })

    // Update categories
    await prisma.category.updateMany({
      where: { createdBy: null },
      data: { createdBy: systemUserId },
    })

    // Update tags
    await prisma.tag.updateMany({
      where: { createdBy: null },
      data: { createdBy: systemUserId },
    })

    // Update muscle groups
    await prisma.muscleGroup.updateMany({
      where: { createdBy: null },
      data: { createdBy: systemUserId },
    })

    // Update muscles
    await prisma.muscle.updateMany({
      where: { createdBy: null },
      data: { createdBy: systemUserId },
    })

    // Update metrics
    await prisma.metric.updateMany({
      where: { createdBy: null },
      data: { createdBy: systemUserId },
    })

    // Update media types
    await prisma.mediaType.updateMany({
      where: { createdBy: null },
      data: { createdBy: systemUserId },
    })

  } catch (error) {
    console.error("Error updating system data creator:", error)
    throw error
  }
}

// Execute seeding
main()
  .catch((error) => {
    console.error("Database seeding failed", { error })
    process.exit(1)
  })
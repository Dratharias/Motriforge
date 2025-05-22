import { Types } from "mongoose";
import {
  IUser,
  IOrganization, IOrganizationMember,
  IRole, IRefreshToken,
  IMedia,
  IExercise, IExerciseAlternative, IExerciseProgression, IExerciseSwap,
  IWorkout, IWorkoutBlock, IWorkoutExercise, IWorkoutSession, IWorkoutSessionExercise,
  IProgram, IProgramScheduleItem,
  IActivity, IActivityEntry, IFavorite,
  IEquipment,
  SessionStatus, IProgressionTracking, IDailyPerformance, IPersonalRecord, IGoalTracking
} from "../models";
import { Repository } from "./base";


/**
 * User repository interface
 */
export interface IUserRepository extends Repository<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findByUsername(username: string): Promise<IUser | null>;
  findByExternalId(provider: string, externalId: string): Promise<IUser | null>;
  findByVerificationToken(token: string): Promise<IUser | null>;
  findByPasswordResetToken(token: string): Promise<IUser | null>;
  updatePassword(id: string | Types.ObjectId, passwordHash: string): Promise<IUser | null>;
  updateMFASettings(id: string | Types.ObjectId, mfaSettings: any): Promise<IUser | null>;
  findUsersInOrganization(organizationId: string | Types.ObjectId): Promise<IUser[]>;
  findByRole(roleId: string | Types.ObjectId): Promise<IUser[]>;
  activateUser(id: string | Types.ObjectId): Promise<IUser | null>;
  deactivateUser(id: string | Types.ObjectId): Promise<IUser | null>;
}

/**
 * Organization repository interface
 */
export interface IOrganizationRepository extends Repository<IOrganization> {
  findByName(name: string): Promise<IOrganization | null>;
  findByOwnerId(ownerId: string | Types.ObjectId): Promise<IOrganization[]>;
  findForUser(userId: string | Types.ObjectId): Promise<IOrganization[]>;
  addMember(organizationId: string | Types.ObjectId, member: Partial<IOrganizationMember>): Promise<IOrganizationMember>;
  removeMember(organizationId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<boolean>;
  updateMember(organizationId: string | Types.ObjectId, userId: string | Types.ObjectId, updates: Partial<IOrganizationMember>): Promise<IOrganizationMember | null>;
  getMembers(organizationId: string | Types.ObjectId): Promise<IOrganizationMember[]>;
  getMember(organizationId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<IOrganizationMember | null>;
  findByVisibility(visibility: string): Promise<IOrganization[]>;
  searchByName(query: string, limit?: number): Promise<IOrganization[]>;
}

/**
 * Permission repository interface
 */
export interface IPermissionRepository extends Repository<IRole> {
  findPermissionsByUser(userId: string | Types.ObjectId): Promise<string[]>;
  findPermissionsByRole(roleId: string | Types.ObjectId): Promise<string[]>;
  findRolesByUser(userId: string | Types.ObjectId): Promise<string[]>;
  findRoles(roleIds: (string | Types.ObjectId)[]): Promise<IRole[]>;
  assignRole(userId: string | Types.ObjectId, roleId: string | Types.ObjectId): Promise<void>;
  removeRole(userId: string | Types.ObjectId, roleId: string | Types.ObjectId): Promise<void>;
  addPermission(roleId: string | Types.ObjectId, permission: string): Promise<void>;
  removePermission(roleId: string | Types.ObjectId, permission: string): Promise<void>;
  hasPermission(userId: string | Types.ObjectId, permission: string): Promise<boolean>;
  findSystemRoles(): Promise<IRole[]>;
  findOrganizationRoles(organizationId: string | Types.ObjectId): Promise<IRole[]>;
}

/**
 * Token repository interface
 */
export interface ITokenRepository extends Repository<IRefreshToken> {
  findByToken(token: string): Promise<IRefreshToken | null>;
  findByUserId(userId: string | Types.ObjectId): Promise<IRefreshToken[]>;
  deleteByToken(token: string): Promise<boolean>;
  deleteAllForUser(userId: string | Types.ObjectId): Promise<boolean>;
  markAsRevoked(tokenId: string | Types.ObjectId): Promise<void>;
  isRevoked(tokenId: string | Types.ObjectId): Promise<boolean>;
  cleanupExpiredTokens(): Promise<number>;
  findActiveTokensForUser(userId: string | Types.ObjectId): Promise<IRefreshToken[]>;
}

/**
 * Media repository interface
 */
export interface IMediaRepository extends Repository<IMedia> {
  findByUrl(url: string): Promise<IMedia | null>;
  findByCategory(category: string): Promise<IMedia[]>;
  findByOrganization(organizationId: string | Types.ObjectId): Promise<IMedia[]>;
  findByTags(tags: string[]): Promise<IMedia[]>;
  findByType(type: string): Promise<IMedia[]>;
  updateMetadata(id: string | Types.ObjectId, metadata: Record<string, any>): Promise<IMedia | null>;
  incrementViewCount(id: string | Types.ObjectId): Promise<void>;
  findRecentMedia(organizationId: string | Types.ObjectId, limit?: number): Promise<IMedia[]>;
}

/**
 * Exercise repository interface
 */
export interface IExerciseRepository extends Repository<IExercise> {
  findByName(name: string): Promise<IExercise | null>;
  findByMuscleGroup(muscleGroup: string): Promise<IExercise[]>;
  findByEquipment(equipmentId: string | Types.ObjectId): Promise<IExercise[]>;
  findByDifficulty(difficulty: string): Promise<IExercise[]>;
  findByType(type: string): Promise<IExercise[]>;
  findByOrganization(organizationId: string | Types.ObjectId): Promise<IExercise[]>;
  searchByName(query: string, limit?: number): Promise<IExercise[]>;
  findAlternatives(exerciseId: string | Types.ObjectId): Promise<IExerciseAlternative[]>;
  findProgressions(exerciseId: string | Types.ObjectId): Promise<IExerciseProgression[]>;
  findSwaps(userId: string | Types.ObjectId): Promise<IExerciseSwap[]>;
  findPopular(limit?: number): Promise<IExercise[]>;
  incrementWorkoutCount(id: string | Types.ObjectId): Promise<void>;
}

/**
 * Workout repository interface
 */
export interface IWorkoutRepository extends Repository<IWorkout> {
  findByName(name: string): Promise<IWorkout | null>;
  findByGoal(goal: string): Promise<IWorkout[]>;
  findByDuration(minDuration: number, maxDuration: number): Promise<IWorkout[]>;
  findByIntensity(intensity: string): Promise<IWorkout[]>;
  findByOrganization(organizationId: string | Types.ObjectId): Promise<IWorkout[]>;
  findByCreator(creatorId: string | Types.ObjectId): Promise<IWorkout[]>;
  findTemplates(): Promise<IWorkout[]>;
  findByTags(tags: string[]): Promise<IWorkout[]>;
  findBlocks(workoutId: string | Types.ObjectId): Promise<IWorkoutBlock[]>;
  findExercises(workoutId: string | Types.ObjectId): Promise<IWorkoutExercise[]>;
  searchByName(query: string, limit?: number): Promise<IWorkout[]>;
  findPopular(limit?: number): Promise<IWorkout[]>;
  incrementSubscriberCount(id: string | Types.ObjectId): Promise<void>;
}

/**
 * Program repository interface
 */
export interface IProgramRepository extends Repository<IProgram> {
  findByName(name: string): Promise<IProgram | null>;
  findByGoal(goal: string): Promise<IProgram[]>;
  findByDuration(minWeeks: number, maxWeeks: number): Promise<IProgram[]>;
  findByOrganization(organizationId: string | Types.ObjectId): Promise<IProgram[]>;
  findByCreator(creatorId: string | Types.ObjectId): Promise<IProgram[]>;
  findTemplates(): Promise<IProgram[]>;
  findByTags(tags: string[]): Promise<IProgram[]>;
  findSchedule(programId: string | Types.ObjectId): Promise<IProgramScheduleItem[]>;
  searchByName(query: string, limit?: number): Promise<IProgram[]>;
  findPopular(limit?: number): Promise<IProgram[]>;
  incrementSubscriberCount(id: string | Types.ObjectId): Promise<void>;
}

/**
 * Activity repository interface
 */
export interface IActivityRepository extends Repository<IActivity> {
  findByUser(userId: string | Types.ObjectId): Promise<IActivity | null>;
  findUserEntries(userId: string | Types.ObjectId, limit?: number): Promise<IActivityEntry[]>;
  recordActivity(entry: Partial<IActivityEntry>): Promise<IActivityEntry>;
  updateStreak(userId: string | Types.ObjectId): Promise<void>;
  findActiveWorkout(userId: string | Types.ObjectId): Promise<IActivity['activeWorkout'] | null>;
  findActiveProgram(userId: string | Types.ObjectId): Promise<IActivity['activeProgram'] | null>;
  setActiveWorkout(userId: string | Types.ObjectId, workoutId: string | Types.ObjectId): Promise<void>;
  setActiveProgram(userId: string | Types.ObjectId, programId: string | Types.ObjectId): Promise<void>;
  clearActiveWorkout(userId: string | Types.ObjectId): Promise<void>;
  clearActiveProgram(userId: string | Types.ObjectId): Promise<void>;
}

/**
 * Favorite repository interface
 */
export interface IFavoriteRepository extends Repository<IFavorite> {
  findByUser(userId: string | Types.ObjectId): Promise<IFavorite | null>;
  addExercise(userId: string | Types.ObjectId, exerciseId: string | Types.ObjectId): Promise<void>;
  removeExercise(userId: string | Types.ObjectId, exerciseId: string | Types.ObjectId): Promise<void>;
  addWorkout(userId: string | Types.ObjectId, workoutId: string | Types.ObjectId): Promise<void>;
  removeWorkout(userId: string | Types.ObjectId, workoutId: string | Types.ObjectId): Promise<void>;
  addProgram(userId: string | Types.ObjectId, programId: string | Types.ObjectId): Promise<void>;
  removeProgram(userId: string | Types.ObjectId, programId: string | Types.ObjectId): Promise<void>;
  isFavoriteExercise(userId: string | Types.ObjectId, exerciseId: string | Types.ObjectId): Promise<boolean>;
  isFavoriteWorkout(userId: string | Types.ObjectId, workoutId: string | Types.ObjectId): Promise<boolean>;
  isFavoriteProgram(userId: string | Types.ObjectId, programId: string | Types.ObjectId): Promise<boolean>;
}

/**
 * Equipment repository interface
 */
export interface IEquipmentRepository extends Repository<IEquipment> {
  findByName(name: string): Promise<IEquipment | null>;
  findByCategory(category: string): Promise<IEquipment[]>;
  findByOrganization(organizationId: string | Types.ObjectId): Promise<IEquipment[]>;
  findPlatformEquipment(): Promise<IEquipment[]>;
  searchByName(query: string, limit?: number): Promise<IEquipment[]>;
  findByTags(tags: string[]): Promise<IEquipment[]>;
  findRelatedEquipment(equipmentId: string | Types.ObjectId): Promise<IEquipment[]>;
}

/**
 * Workout session repository interface
 */
export interface IWorkoutSessionRepository extends Repository<IWorkoutSession> {
  findByUser(userId: string | Types.ObjectId): Promise<IWorkoutSession[]>;
  findByWorkout(workoutId: string | Types.ObjectId): Promise<IWorkoutSession[]>;
  findByProgram(programId: string | Types.ObjectId): Promise<IWorkoutSession[]>;
  findByStatus(status: SessionStatus): Promise<IWorkoutSession[]>;
  findActiveSession(userId: string | Types.ObjectId): Promise<IWorkoutSession | null>;
  findRecentSessions(userId: string | Types.ObjectId, limit?: number): Promise<IWorkoutSession[]>;
  findCompletedSessions(userId: string | Types.ObjectId): Promise<IWorkoutSession[]>;
  findSessionExercises(sessionId: string | Types.ObjectId): Promise<IWorkoutSessionExercise[]>;
  completeSession(id: string | Types.ObjectId): Promise<IWorkoutSession | null>;
  updateProgress(id: string | Types.ObjectId, progress: number): Promise<void>;
}

/**
 * Progression tracking repository interface
 */
export interface IProgressionRepository extends Repository<IProgressionTracking> {
  findByUserAndExercise(userId: string | Types.ObjectId, exerciseId: string | Types.ObjectId): Promise<IProgressionTracking | null>;
  findByUser(userId: string | Types.ObjectId): Promise<IProgressionTracking[]>;
  recordPerformance(data: Partial<IDailyPerformance>): Promise<IDailyPerformance>;
  findDailyPerformance(userId: string | Types.ObjectId, exerciseId: string | Types.ObjectId, dateRange?: { start: Date; end: Date }): Promise<IDailyPerformance[]>;
  calculateAggregates(userId: string | Types.ObjectId, exerciseId: string | Types.ObjectId): Promise<void>;
  findProgressionSummary(userId: string | Types.ObjectId): Promise<any>;
  findTrainerAccessibleData(trainerId: string | Types.ObjectId, clientId: string | Types.ObjectId): Promise<IProgressionTracking[]>;
}

/**
 * Personal record repository interface
 */
export interface IPersonalRecordRepository extends Repository<IPersonalRecord> {
  findByUserAndExercise(userId: string | Types.ObjectId, exerciseId: string | Types.ObjectId): Promise<IPersonalRecord[]>;
  findByUser(userId: string | Types.ObjectId): Promise<IPersonalRecord[]>;
  findByMetric(userId: string | Types.ObjectId, metric: string): Promise<IPersonalRecord[]>;
  findRecentRecords(userId: string | Types.ObjectId, limit?: number): Promise<IPersonalRecord[]>;
  updateRecord(userId: string | Types.ObjectId, exerciseId: string | Types.ObjectId, metric: string, value: number, context?: any): Promise<IPersonalRecord>;
  isPersonalRecord(userId: string | Types.ObjectId, exerciseId: string | Types.ObjectId, metric: string, value: number): Promise<boolean>;
}

/**
 * Goal tracking repository interface
 */
export interface IGoalRepository extends Repository<IGoalTracking> {
  findByUser(userId: string | Types.ObjectId): Promise<IGoalTracking[]>;
  findByUserAndExercise(userId: string | Types.ObjectId, exerciseId: string | Types.ObjectId): Promise<IGoalTracking[]>;
  findByTrainer(trainerId: string | Types.ObjectId): Promise<IGoalTracking[]>;
  findActiveGoals(userId: string | Types.ObjectId): Promise<IGoalTracking[]>;
  findAchievedGoals(userId: string | Types.ObjectId): Promise<IGoalTracking[]>;
  updateProgress(id: string | Types.ObjectId, currentValue: number): Promise<IGoalTracking | null>;
  markAsAchieved(id: string | Types.ObjectId): Promise<IGoalTracking | null>;
  findDueGoals(daysFromNow?: number): Promise<IGoalTracking[]>;
}
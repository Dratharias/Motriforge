import { ObjectId } from 'mongodb';

export interface ExerciseCreationData {
  name: string;
  description: string;
  instructions: string;
  muscleGroups: string[];
  primaryMuscleGroup: string;
  equipment?: ObjectId[];
  exerciseType: ObjectId;
  difficulty: ObjectId;
  mediaIds?: ObjectId[];
  prerequisites?: string[];
  formCues?: string[];
  commonMistakes?: string[];
  tags?: string[];
  organization: ObjectId;
  createdBy: ObjectId;
  shared?: boolean;
  organizationVisibility?: string;
}
import { Database } from '../database/Database';
import { IExerciseProgression } from './ExerciseRepository';
import { ObjectId } from 'mongodb';

export class ExerciseProgressionRepository {
  private readonly collectionName = 'exercise_progressions';

  constructor(private readonly db: Database) {}

  async getByExerciseId(exerciseId: ObjectId): Promise<IExerciseProgression[]> {
    const collection = this.db.getCollection<IExerciseProgression>(this.collectionName);
    return await collection.find({ exerciseId }, { sort: { progressionOrder: 1 } });
  }

  async insertMany(data: IExerciseProgression[]) {
    const collection = this.db.getCollection<IExerciseProgression>(this.collectionName);
    return await collection.insertMany(data);
  }
}

import { MongoClient, Db, Collection, Filter, UpdateFilter, FindOptions } from 'mongodb';
import { Types } from 'mongoose';

export abstract class MongoRepository<T extends { _id: Types.ObjectId }> {
  protected db!: Db;
  protected collection!: Collection<T>;

  constructor(
    private readonly collectionName: string,
    private readonly databaseName: string = 'motriforge'
  ) {}

  async initialize(client: MongoClient): Promise<void> {
    this.db = client.db(this.databaseName);
    this.collection = this.db.collection<T>(this.collectionName);
    await this.ensureIndexes();
  }

  protected async ensureIndexes(): Promise<void> {
    // Override in subclasses to create specific indexes
  }

  protected async findOne(filter: Filter<T>, options?: FindOptions<T>): Promise<T | null> {
    try {
      return await this.collection.findOne(filter, options);
    } catch (error) {
      console.error(`Error finding document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  protected async find(filter: Filter<T>, options?: FindOptions<T>): Promise<T[]> {
    try {
      return await this.collection.find(filter, options).toArray();
    } catch (error) {
      console.error(`Error finding documents in ${this.collectionName}:`, error);
      throw error;
    }
  }

  protected async insertOne(document: Partial<T>): Promise<T> {
    try {
      const docWithId = {
        ...document,
        _id: document._id ?? new Types.ObjectId()
      } as T;

      await this.collection.insertOne(docWithId);
      return docWithId;
    } catch (error) {
      console.error(`Error inserting document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  protected async updateOne(filter: Filter<T>, update: UpdateFilter<T>): Promise<T | null> {
    try {
      const result = await this.collection.findOneAndUpdate(filter, update, {
        returnDocument: 'after'
      });
      return result ?? null;
    } catch (error) {
      console.error(`Error updating document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  protected async findOneAndUpdate(filter: Filter<T>, update: UpdateFilter<T>): Promise<T | null> {
    return this.updateOne(filter, update);
  }

  protected async deleteOne(filter: Filter<T>): Promise<boolean> {
    try {
      const result = await this.collection.deleteOne(filter);
      return result.deletedCount === 1;
    } catch (error) {
      console.error(`Error deleting document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  protected async count(filter: Filter<T>): Promise<number> {
    try {
      return await this.collection.countDocuments(filter);
    } catch (error) {
      console.error(`Error counting documents in ${this.collectionName}:`, error);
      throw error;
    }
  }
}


import { Database } from '~/database/connection';
import { severityClassification } from '~/database/schema';
import { BaseRepository } from '../base-repository';
import { eq, and } from 'drizzle-orm';

export interface SeverityClassification {
  id: string;
  level: string;
  type: string;
  requiresNotification: boolean;
  priorityOrder: number;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

export class SeverityRepository extends BaseRepository<SeverityClassification, typeof severityClassification> {
  constructor(db: Database) {
    super(db, severityClassification, 'priorityOrder');
  }

  /**
   * Find severity by type and level combination
   */
  async findByTypeAndLevel(type: string, level: string): Promise<SeverityClassification | null> {
    const result = await this.db
      .select()
      .from(severityClassification)
      .where(and(
        eq(severityClassification.type, type),
        eq(severityClassification.level, level),
        eq(severityClassification.isActive, true)
      ))
      .limit(1);

    return result[0] as SeverityClassification || null;
  }

  /**
   * Find severities by type
   */
  async findByType(type: string): Promise<SeverityClassification[]> {
    const result = await this.db
      .select()
      .from(severityClassification)
      .where(and(
        eq(severityClassification.type, type),
        eq(severityClassification.isActive, true)
      ))
      .orderBy(severityClassification.priorityOrder);

    return result as SeverityClassification[];
  }

  /**
   * Find severities that require notification
   */
  async findNotificationRequired(): Promise<SeverityClassification[]> {
    const result = await this.db
      .select()
      .from(severityClassification)
      .where(and(
        eq(severityClassification.requiresNotification, true),
        eq(severityClassification.isActive, true)
      ))
      .orderBy(severityClassification.priorityOrder);

    return result as SeverityClassification[];
  }
}



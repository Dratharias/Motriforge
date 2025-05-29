import { Types } from 'mongoose';
import { SharedResource } from '../entities/SharedResource';
import { ShareNotificationService } from './ShareNotificationService';

export interface IExpirationJob {
  readonly id: Types.ObjectId;
  readonly shareId: Types.ObjectId;
  readonly type: 'EXPIRATION' | 'REMINDER';
  readonly scheduledAt: Date;
  readonly executed: boolean;
  readonly createdAt: Date;
}

export class ShareExpirationService {
  private readonly jobs = new Map<string, IExpirationJob>();
  private readonly intervalId: NodeJS.Timeout;

  constructor(
    private readonly notificationService: ShareNotificationService,
    private readonly checkIntervalMs: number = 60000 // Check every minute
  ) {
    this.intervalId = setInterval(() => this.processExpirations(), this.checkIntervalMs);
  }

  scheduleExpiration(sharedResource: SharedResource): void {
    if (!sharedResource.endDate) return;

    // Schedule expiration notification
    this.scheduleJob({
      shareId: sharedResource.id,
      type: 'EXPIRATION',
      scheduledAt: sharedResource.endDate
    });

    // Schedule reminder 7 days before expiration
    const reminderDate = new Date(sharedResource.endDate);
    reminderDate.setDate(reminderDate.getDate() - 7);
    
    if (reminderDate > new Date()) {
      this.scheduleJob({
        shareId: sharedResource.id,
        type: 'REMINDER',
        scheduledAt: reminderDate
      });
    }
  }

  cancelExpiration(shareId: Types.ObjectId): void {
    const toRemove = Array.from(this.jobs.entries())
      .filter(([_, job]) => job.shareId.equals(shareId))
      .map(([key, _]) => key);

    toRemove.forEach(key => this.jobs.delete(key));
  }

  updateExpiration(sharedResource: SharedResource): void {
    this.cancelExpiration(sharedResource.id);
    this.scheduleExpiration(sharedResource);
  }

  getScheduledJobs(shareId?: Types.ObjectId): readonly IExpirationJob[] {
    const allJobs = Array.from(this.jobs.values());
    
    if (shareId) {
      return allJobs.filter(job => job.shareId.equals(shareId));
    }
    
    return allJobs;
  }

  getPendingJobs(): readonly IExpirationJob[] {
    return Array.from(this.jobs.values()).filter(job => !job.executed);
  }

  getOverdueJobs(): readonly IExpirationJob[] {
    const now = new Date();
    return Array.from(this.jobs.values())
      .filter(job => !job.executed && job.scheduledAt <= now);
  }

  async processExpirations(): Promise<void> {
    const overdueJobs = this.getOverdueJobs();
    
    for (const job of overdueJobs) {
      try {
        await this.executeJob(job);
        this.markJobExecuted(job.id);
      } catch (error) {
        console.error(`Failed to execute expiration job ${job.id}:`, error);
      }
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private scheduleJob(params: {
    shareId: Types.ObjectId;
    type: 'EXPIRATION' | 'REMINDER';
    scheduledAt: Date;
  }): void {
    const job: IExpirationJob = {
      id: new Types.ObjectId(),
      shareId: params.shareId,
      type: params.type,
      scheduledAt: params.scheduledAt,
      executed: false,
      createdAt: new Date()
    };

    const key = `${params.shareId}_${params.type}`;
    this.jobs.set(key, job);
  }

  private async executeJob(job: IExpirationJob): Promise<void> {
    // In a real implementation, fetch the shared resource and users from repositories
    console.log(`Executing ${job.type} job for share ${job.shareId}`);

    if (job.type === 'EXPIRATION') {
      // Handle resource expiration
      await this.handleExpiration(job.shareId);
    } else if (job.type === 'REMINDER') {
      // Send reminder notification
      await this.handleReminder(job.shareId);
    }
  }

  private async handleExpiration(shareId: Types.ObjectId): Promise<void> {
    // In a real implementation:
    // 1. Fetch the SharedResource from repository
    // 2. Mark it as expired/archived
    // 3. Fetch the affected users
    // 4. Send expiration notifications
    console.log(`Handling expiration for share ${shareId}`);
  }

  private async handleReminder(shareId: Types.ObjectId): Promise<void> {
    // In a real implementation:
    // 1. Fetch the SharedResource from repository
    // 2. Fetch the affected users
    // 3. Send reminder notifications
    console.log(`Sending reminder for share ${shareId}`);
  }

  private markJobExecuted(jobId: Types.ObjectId): void {
    for (const [key, job] of this.jobs.entries()) {
      if (job.id.equals(jobId)) {
        this.jobs.set(key, { ...job, executed: true });
        break;
      }
    }
  }
}
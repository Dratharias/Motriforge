import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IClientOverview {
  client: Types.ObjectId;
  lastActivity: Date;
  adherenceScore: number;
  missedWorkouts: number;
  completedWorkouts: number;
  nextSession?: Date;
  activeAlerts: number;
  progressMetrics: Map<string, number>;
  notes: string;
}

export interface ITrainerDashboard extends Document {
  trainer: Types.ObjectId;
  lastUpdated: Date;
  clientOverviews: IClientOverview[];
  upcomingSessions: Types.ObjectId[];
  pendingFeedback: Types.ObjectId[];
  clientAlerts: Types.ObjectId[];
  recentActivities: Types.ObjectId[];
  savedFilters: Map<string, any>;
  favoriteClients: Types.ObjectId[];
  activePrograms: number;
  completedPrograms: number;
  averageClientAdherence: number;
  createdAt: Date;
  updatedAt: Date;
}

const ClientOverviewSchema = new Schema({
  client: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastActivity: {
    type: Date
  },
  adherenceScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  missedWorkouts: {
    type: Number,
    default: 0,
    min: 0
  },
  completedWorkouts: {
    type: Number,
    default: 0,
    min: 0
  },
  nextSession: {
    type: Date
  },
  activeAlerts: {
    type: Number,
    default: 0,
    min: 0
  },
  progressMetrics: {
    type: Map,
    of: Number,
    default: new Map()
  },
  notes: {
    type: String
  }
}, { _id: false });

const TrainerDashboardSchema: Schema = new Schema<ITrainerDashboard>({
  trainer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    required: true
  },
  clientOverviews: [ClientOverviewSchema],
  upcomingSessions: [{
    type: Schema.Types.ObjectId,
    ref: 'CoachingSession'
  }],
  pendingFeedback: [{
    type: Schema.Types.ObjectId,
    ref: 'WorkoutSession'
  }],
  clientAlerts: [{
    type: Schema.Types.ObjectId,
    ref: 'ClientAlert'
  }],
  recentActivities: [{
    type: Schema.Types.ObjectId,
    ref: 'ActivityEntry'
  }],
  savedFilters: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  },
  favoriteClients: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }],
  activePrograms: {
    type: Number,
    default: 0,
    min: 0
  },
  completedPrograms: {
    type: Number,
    default: 0,
    min: 0
  },
  averageClientAdherence: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
TrainerDashboardSchema.index({ trainer: 1, 'clientOverviews.client': 1 });
TrainerDashboardSchema.index({ trainer: 1, lastUpdated: -1 });

// Instance methods to support dashboard functionality
TrainerDashboardSchema.methods.getClientProgressSummary = function(clientId: string): any {
  const clientOverview = this.clientOverviews.find(
    (    overview: { client: { toString: () => string; }; }) => overview.client.toString() === clientId.toString()
  );
  return clientOverview ?? null;
};

TrainerDashboardSchema.methods.getClientAdherence = function(clientId: string): number {
  const clientOverview = this.clientOverviews.find(
    (    overview: { client: { toString: () => string; }; }) => overview.client.toString() === clientId.toString()
  );
  return clientOverview ? clientOverview.adherenceScore : 0;
};

export const TrainerDashboardModel = mongoose.model<ITrainerDashboard>(
  'TrainerDashboard',
  TrainerDashboardSchema
);
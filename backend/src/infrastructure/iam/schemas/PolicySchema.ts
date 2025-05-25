import { Schema, model } from 'mongoose';

const PolicyConditionSchema = new Schema({
  operator: {
    type: String,
    enum: ['and', 'or', 'not', 'equals', 'contains', 'greater_than', 'less_than'],
    required: true
  },
  operands: [Schema.Types.Mixed]
}, { _id: false });

const PolicyRuleSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  effect: {
    type: String,
    enum: ['permit', 'deny'],
    required: true
  },
  condition: PolicyConditionSchema,
  obligations: [String],
  advice: [String]
}, { _id: false });

const PolicyTargetSchema = new Schema({
  subjects: [String],
  resources: [String],
  actions: [String],
  environments: Schema.Types.Mixed
}, { _id: false });

const PolicySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  target: {
    type: PolicyTargetSchema,
    required: true
  },
  rules: {
    type: [PolicyRuleSchema],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  priority: {
    type: Number,
    default: 0,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'policies'
});

// Indexes
PolicySchema.index({ name: 1 });
PolicySchema.index({ isActive: 1, priority: -1 });
PolicySchema.index({ 'target.subjects': 1 });
PolicySchema.index({ 'target.resources': 1 });
PolicySchema.index({ 'target.actions': 1 });

export const PolicyModel = model('Policy', PolicySchema);


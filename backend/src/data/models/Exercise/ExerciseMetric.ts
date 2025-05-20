import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';


const ExerciseMetricSchema = new Schema(
  {
    name:         { type: String,  required: true, trim: true },
    unit:         { type: Schema.Types.ObjectId, ref: 'Unit',  required: true           },
    defaultValue: { type: Number,  required: true, default: 0 },
    exerciseId:   { type: Schema.Types.ObjectId, ref: 'Exercise', required: true, index: true },
    isStandard:   { type: Boolean, default: false },
    minValue:     { type: Number,  default: 0     },
    maxValue:     { type: Number,  default: 1000  },
    increment:    { type: Number,  default: 1     },
  },
  { timestamps: true }
);

export type IExerciseMetric = InferSchemaType<typeof ExerciseMetricSchema>;

export type ExerciseMetricDocument = HydratedDocument<IExerciseMetric>;

export const ExerciseMetricModel = model<ExerciseMetricDocument>(
  'ExerciseMetric',
  ExerciseMetricSchema
);

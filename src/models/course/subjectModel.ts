import { Schema, model } from "mongoose";

// Subject interface
export interface ISubject {
  _id: Schema.Types.ObjectId;
  name: string;
  description?: string;
  courseId: Schema.Types.ObjectId;
  instituteId: Schema.Types.ObjectId;
  assignedTeacher?: Schema.Types.ObjectId;
  generalMCQs: Schema.Types.ObjectId[];
  mockMCQs: Schema.Types.ObjectId[];
  publishedMock: Schema.Types.ObjectId[];
  longNotes: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subjectSchema = new Schema<ISubject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Principal",
      required: true,
    },
    assignedTeacher: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
    },
    // NEW: MCQ and Content References
    generalMCQs: [{ type: Schema.Types.ObjectId, ref: "GeneralMCQ" }],
    mockMCQs: [
      {
        type: Schema.Types.ObjectId,
        ref: "MockMCQ",
      },
    ],
    publishedMock: [{ type: Schema.Types.ObjectId, ref: "PublishedMock" }],
    longNotes: [{ type: Schema.Types.ObjectId, ref: "LongNote" }],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes
subjectSchema.index({ courseId: 1 });
subjectSchema.index({ instituteId: 1 });
subjectSchema.index({ assignedTeacher: 1 });
subjectSchema.index({ name: 1, courseId: 1 }, { unique: true });
subjectSchema.index({ isActive: 1 });

// Compound indexes for common queries
subjectSchema.index({ courseId: 1, isActive: 1 });
subjectSchema.index({ assignedTeacher: 1, isActive: 1 });
subjectSchema.index({ instituteId: 1, isActive: 1 });

export const Subject = model<ISubject>("Subject", subjectSchema);

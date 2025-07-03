import { IMCQ } from "../../types/mcq.types";
import { Schema, model, Types } from "mongoose";

interface IPublishedMock {
  // NEW: Subject-based attachment
  subjectId: Types.ObjectId;
  courseId: Types.ObjectId;
  instituteId: Types.ObjectId;
  title: string;
  mcqs: IMCQ[];
  publishedAt: Date;
  // publishedBy: String;
}

const publishedMockSchema = new Schema<IPublishedMock>({
  // NEW: Subject-based relationships
  subjectId: {
    type: Schema.Types.ObjectId,
    ref: "Subject",
    required: [true, "Subject is required"],
  },

  courseId: {
    type: Schema.Types.ObjectId,
    ref: "Course",
    required: [true, "Course is required"],
  },

  instituteId: {
    type: Schema.Types.ObjectId,
    ref: "Principal",
    required: [true, "Institute is required"],
  },

  title: {
    type: String,
    required: true,
  },
  mcqs: [
    {
      questionName: String,
      options: [String],
      correctOption: Number,
    },
  ],
  publishedAt: {
    type: Date,
    default: Date.now,
  },
  // publishedBy: {
  //   type: String,
  //   required: true,
  // },
});
publishedMockSchema.index({ instituteId: 1 });
publishedMockSchema.index({ courseId: 1 });
publishedMockSchema.index({ subjectId: 1 });
export const PublishedMock = model<IPublishedMock>(
  "PublishedMock",
  publishedMockSchema
);

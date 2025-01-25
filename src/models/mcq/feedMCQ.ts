import { IMCQ } from "@/types/mcq.types";
import mongoose, { Schema } from "mongoose";

interface IPublishedMock {
  instituteId: string;
  courseName: string;
  subject: string;
  title: string;
  mcqs: IMCQ[];
  publishedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

const publishedMockSchema = new Schema<IPublishedMock>({
  instituteId: {
    type: String,
    required: true,
    ref: "Institute",
  },
  courseName: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
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
  expiresAt: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

export default mongoose.model<IPublishedMock>(
  "PublishedMock",
  publishedMockSchema
);

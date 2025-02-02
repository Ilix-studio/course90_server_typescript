import { IMCQ } from "@/types/mcq.types";
import { Schema, model } from "mongoose";

interface IPublishedMock {
  instituteId: string;
  courseId: string;
  subject: string;
  title: string;
  mcqs: IMCQ[];
  publishedAt: Date;
  publishedBy: String;
}

const publishedMockSchema = new Schema<IPublishedMock>({
  //Store the institute Id in the model
  instituteId: {
    type: String,
    ref: "Institute",
  },
  //Store the course Id in the model to fetch by differenet course in mobile app
  courseId: {
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
  publishedBy: {
    type: String,
    required: true,
  },
});

export const PublishedMock = model<IPublishedMock>(
  "PublishedMock",
  publishedMockSchema
);

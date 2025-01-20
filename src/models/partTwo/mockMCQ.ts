import { Schema, model, Document } from "mongoose";

export interface PerformanceMCQSchema extends Document {
  questionName: string; // The text of the question
  options: string[]; // Array of options for the question
  correctOption: number; // Index of the correct option in the `options` array
  performanceData?: {
    timeTaken: number;
    attempts: number;
  };
}

// MCQ Sub-Schema
const performanceMCQSchema = new Schema({
  questionName: {
    type: String,
    required: true,
  },
  options: [
    {
      type: String,
      required: true,
    },
  ],
  correctOption: {
    type: Number,
    required: true,
    validate: [
      function (this: PerformanceMCQSchema, value: number): boolean {
        return value >= 0 && value < this.options.length;
      },
      "correctOption must be a valid index of the options array",
    ],
  },
  performanceData: {
    timeTaken: { type: Number },
    attempts: { type: Number },
  },
});

interface MockMCQ extends Document {
  subject: string;
  language: string;
  mcqs: PerformanceMCQSchema[];
  course: Schema.Types.ObjectId;
}
const mockMcqSchema = new Schema<MockMCQ>({
  subject: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    required: true,
  },
  mcqs: [performanceMCQSchema],
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
});
export const GeneralMCQModel = model<MockMCQ>("MockMCQ", mockMcqSchema);

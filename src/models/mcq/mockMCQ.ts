import { Schema, model, Document, Types } from "mongoose";

export interface PerformanceMCQSchema extends Document {
  _id: Types.ObjectId;
  questionName: string; // The text of the question
  options: string[]; // Array of options for the question
  correctOption: number; // Index of the correct option in the `options` array
  performanceData?: {
    timeTaken: number;
    attempts: number;
    marks?: number;
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
    marks: { type: Number },
  },
});

interface MockMCQ extends Document {
  course: Schema.Types.ObjectId;
  subject: string;
  language: string;
  totalMarks: number;
  duration: number;
  passingMarks: number;
  mcqs: PerformanceMCQSchema[];
}
const mockMcqSchema = new Schema<MockMCQ>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    language: {
      type: String,
      required: [true, "Language is required"],
      trim: true,
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
    },
    totalMarks: {
      type: Number,
      required: [true, "Total Marks is required"],
    },
    passingMarks: {
      type: Number,
      required: [true, "Passing Marks is required"],
    },
    mcqs: [performanceMCQSchema],
  },
  {
    timestamps: true,
  }
);
export const MockMCQModel = model<MockMCQ>("MockMCQ", mockMcqSchema);

import { Schema, model, Document, Types } from "mongoose";

export interface MCQSchema extends Document {
  _id: Types.ObjectId;
  questionName: string;
  options: string[];
  correctOption: number;
}

interface GeneralMCQ extends Document {
  course: Types.ObjectId; // Reference to Course model
  subject: string;
  language: string;
  topic: string;
  mcqs: MCQSchema[];
  createdAt: Date;
  updatedAt: Date;
}

// MCQ Sub-Schema
const mcqSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    default: () => new Types.ObjectId(),
  },
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
      function (this: MCQSchema, value: number): boolean {
        return value >= 0 && value < this.options.length;
      },
      "correctOption must be a valid index of the options array",
    ],
  },
});

const generalMcqSchema = new Schema<GeneralMCQ>(
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
    topic: {
      type: String,
      required: [true, "Topic is required"],
      trim: true,
    },
    mcqs: [mcqSchema],
  },
  {
    timestamps: true,
  }
);

export const GeneralMCQModel = model<GeneralMCQ>(
  "GeneralMCQ",
  generalMcqSchema
);

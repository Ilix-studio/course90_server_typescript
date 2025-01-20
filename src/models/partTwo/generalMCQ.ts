import { Schema, model, Document } from "mongoose";

export interface MCQSchema extends Document {
  questionName: string; // The text of the question
  options: string[]; // Array of options for the question
  correctOption: number; // Index of the correct option in the `options` array
}

// MCQ Sub-Schema
const mcqSchema = new Schema({
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

interface GeneralMCQ extends Document {
  subject: string;
  language: string;
  topic: string;
  mcqs: MCQSchema[];
  course: Schema.Types.ObjectId;
}
const generalMcqSchema = new Schema<GeneralMCQ>({
  subject: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    required: true,
  },
  topic: {
    type: String,
  },
  mcqs: [mcqSchema],
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
});
export const GeneralMCQModel = model<GeneralMCQ>(
  "GeneralMCQ",
  generalMcqSchema
);

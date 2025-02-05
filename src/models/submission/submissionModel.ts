// models/submission/submissionModel.ts
import { Schema, model, Document, Types } from "mongoose";

interface Answer {
  questionId: Types.ObjectId;
  selectedOption: number;
  isCorrect: boolean;
  timeTaken: number;
}

interface Submission extends Document {
  institute: Types.ObjectId;
  course: Types.ObjectId;
  type: "GQ" | "MQ" | "FQ";
  questionSet: Types.ObjectId;
  answers: Answer[];
  score: number;
  totalQuestions: number;
  submittedAt: Date;
}

const SubmissionSchema = new Schema<Submission>({
  institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true },
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  type: { type: String, enum: ["GQ", "MQ"], required: true },
  questionSet: { type: Schema.Types.ObjectId, required: true },
  answers: [
    {
      questionId: { type: Schema.Types.ObjectId, required: true },
      selectedOption: { type: Number, required: true },
      isCorrect: { type: Boolean, required: true },
      timeTaken: { type: Number, required: true },
    },
  ],
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now },
});

// Indexes for query optimization
SubmissionSchema.index({ student: 1, type: 1 });
SubmissionSchema.index({ institute: 1, course: 1 });

export const SubmissionModel = model<Submission>(
  "Submission",
  SubmissionSchema
);

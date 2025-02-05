import { Schema, model, Document, Types } from "mongoose";

// Interface for Feed Question Submissions
interface FeedSubmission extends Document {
  course: Types.ObjectId;
  questionSet: Types.ObjectId;
  answers: {
    questionId: Types.ObjectId;
    selectedOption: number;
    isCorrect: boolean;
    timeTaken: number;
  }[];
  score: number;
  totalQuestions: number;
  submittedAt: Date;
}

const FeedSubmissionSchema = new Schema<FeedSubmission>({
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  questionSet: {
    type: Schema.Types.ObjectId,
    ref: "PublishedMock", // Reference to your feed questions
    required: true,
  },
  answers: [
    {
      questionId: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      selectedOption: {
        type: Number,
        required: true,
      },
      isCorrect: {
        type: Boolean,
        required: true,
      },
      timeTaken: {
        type: Number,
        required: true,
      },
    },
  ],
  score: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for query optimization
FeedSubmissionSchema.index({ student: 1 });
FeedSubmissionSchema.index({ questionSet: 1 });

export const FeedSubmissionModel = model<FeedSubmission>(
  "FeedSubmission",
  FeedSubmissionSchema
);

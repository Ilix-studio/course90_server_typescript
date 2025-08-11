import mongoose, { model, Schema } from "mongoose";

import { IAnswer, ISubmission } from "types/submission.types";

// Answer subdocument schema
const answerSchema = new Schema<IAnswer>({
  questionId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  selectedOption: {
    type: Number,
    required: true,
    min: 0,
    max: 10, // Assuming max 10 options
  },
  correctOption: {
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
    min: 0,
  },
  attemptNumber: {
    type: Number,
    default: 1,
  },
  confidence: {
    type: Number,
    min: 1,
    max: 5,
  },
});

// Main submission schema
const submissionSchema = new Schema<ISubmission>(
  {
    // Student identification
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    passkeyId: {
      type: String,
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
    },

    // Institutional references
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Principal",
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
    },

    // Question set information
    type: {
      type: String,
      enum: ["GQ", "MQ", "PQ", "LN"],
      required: true,
    },
    questionSetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    questionSetTitle: {
      type: String,
    },

    // Submission data
    answers: [answerSchema],

    // Scoring information
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },
    correctAnswers: {
      type: Number,
      required: true,
      min: 0,
    },
    wrongAnswers: {
      type: Number,
      required: true,
      min: 0,
    },
    unansweredQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    // Time tracking
    totalTimeTaken: {
      type: Number,
      required: true,
      min: 0,
    },
    timeLimit: {
      type: Number,
    },
    isTimeExpired: {
      type: Boolean,
      default: false,
    },

    // Performance metrics
    totalMarks: {
      type: Number,
      min: 0,
    },
    negativeMarks: {
      type: Number,
      default: 0,
    },
    passingMarks: {
      type: Number,
    },
    isPassed: {
      type: Boolean,
    },

    // Attempt tracking
    attemptNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    isRetry: {
      type: Boolean,
      default: false,
    },
    previousAttemptId: {
      type: Schema.Types.ObjectId,
      ref: "Submission",
    },

    // Analytics data
    averageTimePerQuestion: {
      type: Number,
      min: 0,
    },
    fastestQuestion: {
      type: Number,
      min: 0,
    },
    slowestQuestion: {
      type: Number,
      min: 0,
    },

    // Behavioral tracking
    tabSwitches: {
      type: Number,
      default: 0,
    },
    suspiciousActivity: [
      {
        type: String,
      },
    ],

    // Metadata
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: {
      type: Date,
    },
    pausedDuration: {
      type: Number,
      default: 0,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },

    // Status
    submissionStatus: {
      type: String,
      enum: ["COMPLETED", "PARTIAL", "TIMEOUT", "INVALID"],
      default: "COMPLETED",
    },
    isReviewed: {
      type: Boolean,
      default: false,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
    },
    reviewedAt: {
      type: Date,
    },
    teacherComments: {
      type: String,
    },

    // Additional analytics
    // difficultyAnalysis: {
    //   easy: {
    //     correct: { type: Number, default: 0 },
    //     total: { type: Number, default: 0 }
    //   },
    //   medium: {
    //     correct: { type: Number, default: 0 },
    //     total: { type: Number, default: 0 }
    //   },
    //   hard: {
    //     correct: { type: Number, default: 0 },
    //     total: { type: Number, default: 0 }
    //   }
    // },

    subjectWiseAnalysis: [
      {
        subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
        subjectName: String,
        correct: Number,
        total: Number,
        percentage: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for optimal query performance
submissionSchema.index({ studentId: 1, courseId: 1 });
submissionSchema.index({ passkeyId: 1, submittedAt: -1 });
submissionSchema.index({ instituteId: 1, type: 1 });
submissionSchema.index({ questionSetId: 1 });
submissionSchema.index({ submittedAt: -1 });
submissionSchema.index({ type: 1, submittedAt: -1 });
submissionSchema.index({ studentId: 1, type: 1, submittedAt: -1 });

// Compound indexes for analytics
submissionSchema.index({ courseId: 1, subjectId: 1, submittedAt: -1 });
submissionSchema.index({ instituteId: 1, courseId: 1, percentage: -1 });

// Virtual fields
submissionSchema.virtual("accuracyRate").get(function () {
  return this.totalQuestions > 0
    ? (this.correctAnswers / this.totalQuestions) * 100
    : 0;
});

submissionSchema.virtual("speedRate").get(function () {
  return this.totalQuestions > 0
    ? this.totalTimeTaken / this.totalQuestions
    : 0;
});

// Instance methods
submissionSchema.methods.calculateGrade = function () {
  if (this.percentage >= 90) return "A+";
  if (this.percentage >= 80) return "A";
  if (this.percentage >= 70) return "B+";
  if (this.percentage >= 60) return "B";
  if (this.percentage >= 50) return "C";
  return "F";
};

submissionSchema.methods.getPerformanceLevel = function () {
  if (this.percentage >= 85) return "Excellent";
  if (this.percentage >= 70) return "Good";
  if (this.percentage >= 50) return "Average";
  return "Needs Improvement";
};

// Static methods for analytics
submissionSchema.statics.getStudentAnalytics = function (
  studentId: string,
  courseId?: string
) {
  const matchQuery: any = { studentId };
  if (courseId) matchQuery.courseId = courseId;

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$type",
        totalSubmissions: { $sum: 1 },
        averageScore: { $avg: "$score" },
        averagePercentage: { $avg: "$percentage" },
        totalTimeTaken: { $sum: "$totalTimeTaken" },
        bestScore: { $max: "$score" },
        recentSubmission: { $max: "$submittedAt" },
      },
    },
  ]);
};

submissionSchema.statics.getCourseAnalytics = function (courseId: string) {
  return this.aggregate([
    { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
    {
      $group: {
        _id: "$subjectId",
        totalSubmissions: { $sum: 1 },
        averageScore: { $avg: "$score" },
        averagePercentage: { $avg: "$percentage" },
        totalStudents: { $addToSet: "$studentId" },
      },
    },
    {
      $addFields: {
        totalUniqueStudents: { $size: "$totalStudents" },
      },
    },
  ]);
};

// Pre-save middleware
submissionSchema.pre("save", function (next) {
  // Calculate analytics before saving
  if (this.answers && this.answers.length > 0) {
    const timeTaken = this.answers.map((a) => a.timeTaken);
    this.averageTimePerQuestion =
      timeTaken.reduce((a, b) => a + b, 0) / timeTaken.length;
    this.fastestQuestion = Math.min(...timeTaken);
    this.slowestQuestion = Math.max(...timeTaken);
  }

  // Ensure consistency
  this.wrongAnswers =
    this.totalQuestions - this.correctAnswers - this.unansweredQuestions;
  this.percentage =
    this.totalQuestions > 0
      ? (this.correctAnswers / this.totalQuestions) * 100
      : 0;

  next();
});

// Export types for use in controllers
export type { ISubmission, IAnswer };

// Legacy model for backward compatibility
export const SubmissionModel = model<ISubmission>(
  "Submission",
  submissionSchema
);

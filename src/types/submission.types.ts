import { Document, Types } from "mongoose";

// Enhanced Answer interface with additional tracking
export interface IAnswer {
  questionId: Types.ObjectId;
  selectedOption: number;
  correctOption: number; // Store correct answer for analysis
  isCorrect: boolean;
  timeTaken: number; // Time in seconds
  attemptNumber?: number; // If retries allowed
  confidence?: number; // Student confidence level (1-5)
}

// Main Submission interface
export interface ISubmission extends Document {
  // Student identification
  studentId: Types.ObjectId; // Reference to Student model
  passkeyId: string; // Passkey used for submission
  deviceId: string; // Device identifier for security

  // Institutional references
  instituteId: Types.ObjectId; // Institute reference
  courseId: Types.ObjectId; // Course reference
  subjectId?: Types.ObjectId; // Subject reference (if applicable)

  // Question set information
  type: "GQ" | "MQ" | "PQ" | "LN"; // GQ=General, MQ=Mock, PQ=Published, LN=LongNote
  questionSetId: Types.ObjectId; // Reference to the question set
  questionSetTitle?: string; // Title for easier identification

  // Submission data
  answers: IAnswer[];

  // Scoring information
  score: number; // Correct answers count
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unansweredQuestions: number;
  percentage: number;

  // Time tracking
  totalTimeTaken: number; // Total time in seconds
  timeLimit?: number; // Time limit if applicable
  isTimeExpired: boolean; // Whether submission was due to timeout

  // Performance metrics
  totalMarks?: number; // For mock tests with marking scheme
  negativeMarks?: number; // Negative marking if applicable
  passingMarks?: number; // Required passing marks
  isPassed?: boolean; // Whether student passed

  // Attempt tracking
  attemptNumber: number; // Which attempt this is (1, 2, 3...)
  isRetry: boolean; // Whether this is a retry
  previousAttemptId?: Types.ObjectId; // Reference to previous attempt

  // Analytics data
  averageTimePerQuestion: number;
  fastestQuestion: number; // Time for fastest answered question
  slowestQuestion: number; // Time for slowest answered question

  // Behavioral tracking
  tabSwitches?: number; // Number of tab switches (if detected)
  suspiciousActivity?: string[]; // Array of suspicious activities

  // Metadata
  submittedAt: Date;
  startedAt?: Date; // When the test was started
  pausedDuration?: number; // Total paused time
  ipAddress?: string; // For security tracking
  userAgent?: string; // Browser/device info

  // Status
  submissionStatus: "COMPLETED" | "PARTIAL" | "TIMEOUT" | "INVALID";
  isReviewed: boolean; // Whether teacher has reviewed
  reviewedBy?: Types.ObjectId; // Teacher who reviewed
  reviewedAt?: Date;
  teacherComments?: string;

  // Additional analytics
  difficultyAnalysis?: {
    easy: { correct: number; total: number };
    medium: { correct: number; total: number };
    hard: { correct: number; total: number };
  };

  subjectWiseAnalysis?: {
    subjectId: Types.ObjectId;
    subjectName: string;
    correct: number;
    total: number;
    percentage: number;
  }[];
}

// Add this to your submission.types.ts file
export interface AnswerSubmission {
  questionId: string;
  selectedOption: number;
  timeTaken?: number;
}

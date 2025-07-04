import { Schema, model, Document, Types } from "mongoose";

export interface IPerformanceMCQSchema extends Document {
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
    validate: {
      validator: function (this: any, value: number): boolean {
        // Ensure options exist and value is within range
        if (!this.options || !Array.isArray(this.options)) {
          return false;
        }
        return value >= 0 && value < this.options.length;
      },
      message: function (this: any, props: any) {
        const optionsLength = this.options?.length || 0;
        return `correctOption (${props.value}) must be between 0 and ${
          optionsLength - 1
        }`;
      },
    },
  },
  performanceData: {
    timeTaken: { type: Number },
    attempts: { type: Number },
    marks: { type: Number },
  },
});

interface IMockMCQ extends Document {
  // NEW: Subject-based attachment
  subjectId: Types.ObjectId;
  courseId: Types.ObjectId;
  instituteId: Types.ObjectId;
  language: string;
  totalMarks: number;
  duration: number;
  passingMarks: number;
  negativeMarking: boolean;
  mcqs: IPerformanceMCQSchema[];
}
const mockMcqSchema = new Schema<IMockMCQ>(
  {
    // NEW: Subject-based relationships
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject is required"],
    },

    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
    },

    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Principal",
      required: [true, "Institute is required"],
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
    negativeMarking: {
      type: Boolean,
      default: false,
    },
    mcqs: [performanceMCQSchema],
  },
  {
    timestamps: true,
  }
);

mockMcqSchema.index({ instituteId: 1 });
mockMcqSchema.index({ subjectId: 1 });
mockMcqSchema.index({ courseId: 1 });

export const MockMCQModel = model<IMockMCQ>("MockMCQ", mockMcqSchema);

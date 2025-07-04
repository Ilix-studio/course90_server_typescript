import { Schema, model, Document, Types } from "mongoose";

export interface MCQSchema extends Document {
  _id: Types.ObjectId;
  questionName: string;
  options: string[];
  correctOption: number;
}

interface GeneralMCQ extends Document {
  instituteId: Types.ObjectId;
  courseId: Types.ObjectId; // Reference to Course model
  subjectId: Types.ObjectId;
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
    trim: true,
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
        return `correctOption (${props.value}) must be between 0 and ${
          (this.options?.length || 1) - 1
        }`;
      },
    },
  },
});

const generalMcqSchema = new Schema<GeneralMCQ>(
  {
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Principal",
      required: [true, "Institute is required"],
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject is required"],
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

generalMcqSchema.index({ instituteId: 1 });
generalMcqSchema.index({ courseId: 1 });
generalMcqSchema.index({ subjectId: 1 });
generalMcqSchema.index({ instituteId: 1, subjectId: 1 });

export const GeneralMCQModel = model<GeneralMCQ>(
  "GeneralMCQ",
  generalMcqSchema
);

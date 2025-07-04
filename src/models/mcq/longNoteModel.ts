import { Schema, model, Types, Document } from "mongoose";

interface NoteBody {
  _id?: Types.ObjectId;
  title: string;
  content: string;
  wordCount?: number;
}

interface LongNotes extends Document {
  // NEW: Subject-based attachment
  subjectId: Types.ObjectId;
  courseId: Types.ObjectId;
  instituteId: Types.ObjectId;
  language: string;
  topic: string;
  notebody: NoteBody[];
  createdAt: Date;
  updatedAt: Date;
}

const noteBodySchema = new Schema<NoteBody>({
  title: {
    type: String,
    required: [true, "title is required"],
    trim: true,
  },
  content: {
    type: String,
    required: [true, "Content is required"],
    trim: true,
    maxlength: [120000, "Content cannot exceed 120,000 characters"],
  },

  wordCount: {
    type: Number,
  },
});
const longNoteSchema = new Schema<LongNotes>({
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
  topic: {
    type: String,
    required: [true, "Topic is required"],
    trim: true,
  },
  notebody: {
    type: [noteBodySchema],
    default: [], // Initialize as empty array
  },
  createdAt: { type: Date, default: Date.now },
});

noteBodySchema.pre("save", function (next) {
  if (this.content) {
    // Simple word count calculation (splitting by spaces)
    this.wordCount = this.content.trim().split(/\s+/).length;
  }
  next();
});

longNoteSchema.index({ instituteId: 1 });
longNoteSchema.index({ courseId: 1 });
longNoteSchema.index({ subjectId: 1 });

export const LongNoteModel = model<LongNotes>("LongNote", longNoteSchema);

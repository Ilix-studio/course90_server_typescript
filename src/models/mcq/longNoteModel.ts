import { Schema, model, Types, Document } from "mongoose";

interface NoteBody {
  _id?: Types.ObjectId;
  title: string;
  content: string;
  wordCount?: number;
}

interface LongNotes extends Document {
  course: Types.ObjectId;
  subject: string;
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
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
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

export const LongNoteModel = model<LongNotes>("LongNote", longNoteSchema);

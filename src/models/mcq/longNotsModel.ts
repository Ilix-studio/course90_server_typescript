import { Schema, model, Document } from "mongoose";

//Institute = can be schools/ college/ university/ personal tutor
interface LongNotes extends Document {
  title: string;
  content: string;
  course: Schema.Types.ObjectId;
  createdAt: Date;
}
const longNoteSchema = new Schema<LongNotes>({
  title: { type: String, required: true },
  content: { type: String, required: true },
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  createdAt: { type: Date, default: Date.now },
});

export const LongNoteModel = model<LongNotes>("LongNote", longNoteSchema);

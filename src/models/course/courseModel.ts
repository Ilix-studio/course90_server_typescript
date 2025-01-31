import { Schema, model, Document } from "mongoose";

interface Course extends Document {
  name: string;
  institute: Schema.Types.ObjectId;
  generalMCQs: Schema.Types.ObjectId[];
  mockMCQs: Schema.Types.ObjectId[];
  longNotes: string[];
}

const courseSchema = new Schema<Course>({
  name: { type: String, required: true },
  institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true },
  generalMCQs: [{ type: Schema.Types.ObjectId, ref: "GeneralMCQ" }],
  mockMCQs: [{ type: Schema.Types.ObjectId, ref: "MockMCQ" }],
  longNotes: [{ type: Schema.Types.ObjectId, ref: "LongNote" }],
});

export const CourseModel = model<Course>("Course", courseSchema);

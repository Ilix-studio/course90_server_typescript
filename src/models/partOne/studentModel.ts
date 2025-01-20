import { Schema, model, Document } from "mongoose";

interface Student extends Document {
  passkey: string;
  deviceId: string;
  institute: Schema.Types.ObjectId;
  courses: Schema.Types.ObjectId[];
}

const studentSchema = new Schema<Student>({
  passkey: { type: String, required: true, unique: true },
  deviceId: { type: String, required: true },
  institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true },
  courses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
});

export const Student = model<Student>("Student", studentSchema);

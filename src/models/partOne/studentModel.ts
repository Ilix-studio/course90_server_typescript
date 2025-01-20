import { Schema, model, Document } from "mongoose";

interface Student extends Document {
  passkeys: {
    passkey: string; // Passkey provided by the institute
    institute: Schema.Types.ObjectId; // Reference to the institute
    course: Schema.Types.ObjectId; // Reference to the course
    isActive: boolean; // Indicates if this passkey is currently active
  }[];
  deviceId: string;
}

const studentSchema = new Schema<Student>({
  passkeys: [
    {
      passkey: { type: String, required: true },
      institute: {
        type: Schema.Types.ObjectId,
        ref: "Institute",
        required: true,
      },
      course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
      isActive: { type: Boolean, default: false },
    },
  ],
  deviceId: { type: String, required: true },
});

export const Student = model<Student>("Student", studentSchema);

import { Schema, model, Document } from "mongoose";

interface Student extends Document {
  instituteName: Schema.Types.ObjectId;
  passcode: {
    passkey: string; // Passkey provided by the institute
    institute: Schema.Types.ObjectId; // Reference to the institute
    course: Schema.Types.ObjectId; // Reference to the course
    isActive: boolean; // Indicates if this passkey is currently active
  }[];
  performance: {
    courseId: Schema.Types.ObjectId;
    scores: number[];
  }[];

  deviceId: string;
}

const studentSchema = new Schema<Student>({
  instituteName: { type: Schema.Types.ObjectId },
  passcode: [
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
  performance: [
    {
      courseId: { type: Schema.Types.ObjectId, ref: "Course" },
      scores: [{ type: Number }],
    },
  ],
});

export const StudentModel = model<Student>("Student", studentSchema);

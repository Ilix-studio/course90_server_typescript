import { Schema, model, Document, Types } from "mongoose";

interface PasscodeEntry {
  passkey: string;
  institute: Types.ObjectId;
  course: Types.ObjectId;
  isActive: boolean;
  activatedAt?: Date;
  expiresAt?: Date;
  timePeriod?: string;
}

interface Student extends Document {
  passcode: PasscodeEntry[];
  deviceId: string;
  performance: {
    courseId: Types.ObjectId;
    scores: number[];
  }[];
}

const studentSchema = new Schema<Student>({
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
      activatedAt: { type: Date },
      expiresAt: { type: Date },
      timePeriod: { type: String },
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

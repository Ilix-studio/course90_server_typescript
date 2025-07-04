// models/auth/studentModel.ts
import {
  IStudentDocument,
  IStudentPasscode,
} from "../../types/studentAuth.types";
import { Schema, model, Model } from "mongoose";

// Interface for static methods
interface IStudentModel extends Model<IStudentDocument> {
  findByPasskeyAndDevice(
    passkeyId: string,
    deviceId: string
  ): Promise<IStudentDocument | null>;
  findActiveStudent(
    passkeyId: string,
    deviceId: string
  ): Promise<IStudentDocument | null>;
}

// Subdocument schema for passcodes (passkeys)
const studentPasscodeSchema = new Schema<IStudentPasscode>(
  {
    // The unique passkey identifier
    passkeyId: {
      type: String,
      required: true,
    },

    // References to institute and course
    institute: {
      type: Schema.Types.ObjectId,
      ref: "InstituteAuth",
      required: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    // Status flags and dates
    isActive: {
      type: Boolean,
      default: true,
    },
    activatedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
  },
  { _id: false }
); // Disable _id for subdocuments

// Main student schema
const studentSchema = new Schema<IStudentDocument, IStudentModel>(
  {
    // Optional personal information (can be added later)
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      sparse: true, // Allows multiple nulls but enforces uniqueness if provided
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },

    // Device identifier (required for security)
    deviceId: {
      type: String,
      required: [true, "Device ID is required"],
      trim: true,
    },

    // Array of passcodes (passkeys) the student has access to
    nanoId: [studentPasscodeSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes for query optimization
studentSchema.index({ deviceId: 1 });
studentSchema.index({ "nanoId.passkeyId": 1 });
studentSchema.index({ "nanoId.passkeyId": 1, deviceId: 1 }, { unique: true });
studentSchema.index({ email: 1 }, { sparse: true });

// Instance methods
studentSchema.methods.getActivePasscode = function (
  this: IStudentDocument
): IStudentPasscode | undefined {
  return this.nanoId.find((p: IStudentPasscode) => p.isActive === true);
};

studentSchema.methods.hasCourseAccess = function (
  this: IStudentDocument,
  courseId: string
): boolean {
  return this.nanoId.some(
    (p: IStudentPasscode) =>
      p.course.toString() === courseId &&
      p.isActive === true &&
      (!p.expiresAt || p.expiresAt > new Date())
  );
};

// Static methods
studentSchema.statics.findByPasskeyAndDevice = function (
  passkeyId: string,
  deviceId: string
) {
  return this.findOne({
    deviceId,
    "nanoId.passkeyId": passkeyId,
    "nanoId.isActive": true,
  }).populate([
    {
      path: "nanoId.institute",
      select: "instituteName email",
    },
    {
      path: "nanoId.course",
      select: "name description",
    },
  ]);
};

studentSchema.statics.findActiveStudent = function (
  passkeyId: string,
  deviceId: string
) {
  return this.findOne({
    deviceId,
    "nanoId.passkeyId": passkeyId,
    "nanoId.isActive": true,
    $or: [
      { "nanoId.expiresAt": { $exists: false } },
      { "nanoId.expiresAt": { $gt: new Date() } },
    ],
  });
};

// Create and export the model
export const StudentModel = model<IStudentDocument, IStudentModel>(
  "Student",
  studentSchema
);

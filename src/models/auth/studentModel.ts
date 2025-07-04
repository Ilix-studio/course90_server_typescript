// src/models/auth/studentModel.ts
import { Schema, model } from "mongoose";
import {
  IStudentDocument,
  IStudentModel,
  IStudentPasskey,
} from "../../types/studentAuth.types";

// Subdocument schema for passkeys
const studentPasskeySchema = new Schema<IStudentPasskey>(
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
    courseId: {
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
    // Personal information (optional, can be updated later)
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
    phoneNumber: {
      type: String,
      sparse: true,
      trim: true,
    },

    // Device identifier (required for security)
    deviceId: {
      type: String,
      required: [true, "Device ID is required"],
      trim: true,
    },

    // Array of passkeys the student has access to
    // Renamed from nanoId to passkeys for clarity
    passkeys: [studentPasskeySchema],
  },
  {
    timestamps: true,
  }
);

// Indexes for query optimization
studentSchema.index({ deviceId: 1 });
studentSchema.index({ "passkeys.passkeyId": 1 });

// This index ensures each passkey can only be assigned to one device
studentSchema.index(
  { "passkeys.passkeyId": 1 },
  { unique: true, sparse: true }
);

// This index ensures email uniqueness when provided
studentSchema.index({ email: 1 }, { sparse: true });

// This index ensures only one active passkey per device
studentSchema.index(
  { deviceId: 1, "passkeys.isActive": 1 },
  {
    unique: true,
    partialFilterExpression: { "passkeys.isActive": true },
    sparse: true,
  }
);

// Instance methods
studentSchema.methods.getActivePasskey = function (
  this: IStudentDocument
): IStudentPasskey | undefined {
  return this.passkeys.find((p: IStudentPasskey) => p.isActive === true);
};

studentSchema.methods.hasCourseAccess = function (
  this: IStudentDocument,
  courseId: string
): boolean {
  return this.passkeys.some(
    (p: IStudentPasskey) =>
      p.courseId.toString() === courseId &&
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
    "passkeys.passkeyId": passkeyId,
  }).populate([
    {
      path: "passkeys.institute",
      select: "instituteName email",
    },
    {
      path: "passkeys.course",
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
    "passkeys.passkeyId": passkeyId,
    "passkeys.isActive": true,
    $or: [
      { "passkeys.expiresAt": { $exists: false } },
      { "passkeys.expiresAt": { $gt: new Date() } },
    ],
  });
};

// Create and export the model
export const StudentModel = model<IStudentDocument, IStudentModel>(
  "Student",
  studentSchema
);

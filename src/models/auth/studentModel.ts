// models/auth/studentModel.ts
import { Schema, model } from "mongoose";
import { IStudentModel, IStudentPasscode } from "../../types/auth.types";

// Subdocument schema for passcodes (passkeys)
const studentPasscodeSchema = new Schema({
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
});

// Main student schema
const studentSchema = new Schema<IStudentModel>(
  {
    // Optional personal information (can be added later)
    name: {
      type: String,
    },
    email: {
      type: String,
      sparse: true, // Allows multiple nulls but enforces uniqueness if provided
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },

    // Device identifier (required for security)
    deviceId: {
      type: String,
      required: [true, "Device ID is required"],
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
studentSchema.index({ "nanoId.passkey": 1 });
studentSchema.index({ "nanoId.passkey": 1, deviceId: 1 }, { unique: true });

// Define the type for the document instance method this
interface StudentMethods {
  getActivePasscode(): IStudentPasscode | undefined;
  hasCourseAccess(courseId: string): boolean;
}

// Define methods for the student schema with proper typing
studentSchema.methods = {
  // Get the currently active passcode
  getActivePasscode: function (
    this: IStudentModel
  ): IStudentPasscode | undefined {
    return this.nanoId.find((p: IStudentPasscode) => p.isActive === true);
  },

  // Check if a student has access to a specific course
  hasCourseAccess: function (this: IStudentModel, courseId: string): boolean {
    return this.nanoId.some(
      (p: IStudentPasscode) =>
        p.course.toString() === courseId &&
        p.isActive === true &&
        (!p.expiresAt || p.expiresAt > new Date())
    );
  },
};

// Add the methods to the model schema
type StudentModel = IStudentModel & StudentMethods;

// Create and export the model
export const StudentModel = model<IStudentModel>("Student", studentSchema);

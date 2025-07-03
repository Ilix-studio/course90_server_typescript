import { Schema, SchemaDefinitionProperty, model } from "mongoose";
import bcrypt from "bcryptjs";
import { ITeacherDocument } from "../../types/auth.types";
import { UserRole } from "../../constants/enums";
import { PERMISSIONS } from "../../constants/permissions";

const teacherSchema = new Schema<ITeacherDocument>(
  {
    name: { type: String, required: true, trim: true },
    password: {
      type: String,
      required: true,
      minlength: [6, "Password must be at least 6 characters long"],
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.TEACHER,
    },
    applicationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    phoneNumber: {
      type: Number,
      required: [true, "Phone number is required"],
      unique: true, // ← Make phoneNumber unique instead
    },
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Principal",
      required: true,
    },
    assignedSubjects: [{ type: Schema.Types.ObjectId, ref: "Subject" }],
    permissions: {
      type: [String],
      default: [...PERMISSIONS.TEACHER], // Spread to make it mutable
      validate: {
        validator: function (permissions: string[]) {
          return permissions.every((permission) =>
            PERMISSIONS.TEACHER.includes(permission as any)
          );
        },
        message: "Invalid permission provided",
      },
    } as SchemaDefinitionProperty<string[]>,

    isActive: { type: Boolean, default: true },
    isCredentialsSent: { type: Boolean, default: false },
    credentialsSentAt: { type: Date },
  },
  { timestamps: true }
);

// Updated Indexes - sparse index for email
// Allows multiple null values
teacherSchema.index({ applicationId: 1 }, { unique: true });
teacherSchema.index({ phoneNumber: 1 }, { unique: true });
teacherSchema.index({ instituteId: 1 });

// Pre-save hook to hash password
teacherSchema.pre("save", async function (this: ITeacherDocument, next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare passwords
teacherSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const Teacher = model<ITeacherDocument>("Teacher", teacherSchema);

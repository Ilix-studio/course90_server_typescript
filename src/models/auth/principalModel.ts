import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import { IPrincipalDocument } from "../../types/auth.types";
import { InstituteType, UserRole } from "../../constants/enums";

const principalSchema = new Schema<IPrincipalDocument>(
  {
    instituteName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },
    password: {
      type: String,
      required: true,
      minlength: [6, "Password must be at least 6 characters long"],
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.PRINCIPAL,
    },
    phoneNumber: {
      type: Number,
      required: [true, "Phone number is required"],
      unique: true,
    },
    instituteType: {
      type: String,
      enum: Object.values(InstituteType),
      required: [true, "Institute type is required"],
    },
    msmeNumber: {
      type: String,
      required: function (this: IPrincipalDocument) {
        return this.instituteType === InstituteType.COACHING;
      },
    },
    udiseNumber: {
      type: String,
      required: function (this: IPrincipalDocument) {
        return this.instituteType === InstituteType.SENIOR_SECONDARY;
      },
    },
    isActive: { type: Boolean, default: true },
    courseId: [{ type: Schema.Types.ObjectId, ref: "Course" }],
    teachers: [{ type: Schema.Types.ObjectId, ref: "Teacher" }],
    profile: [{ type: Schema.Types.ObjectId, ref: "InstituteProfile" }],
  },
  { timestamps: true }
);

// Indexes
principalSchema.index({ email: 1 });
principalSchema.index({ phoneNumber: 1 });

// Pre-save hook to hash password
principalSchema.pre("save", async function (next) {
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
principalSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const Principal = model<IPrincipalDocument>(
  "InstituteAuth",
  principalSchema
);

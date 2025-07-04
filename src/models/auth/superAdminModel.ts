import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import { ISuperAdminDocument } from "../../types/auth.types";
import { UserRole } from "../../constants/enums";

const superAdminSchema = new Schema<ISuperAdminDocument>(
  {
    name: { type: String, required: true, trim: true },
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
      default: UserRole.SUPER_ADMIN,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes
superAdminSchema.index({ email: 1 });

// Pre-save hook to hash password
superAdminSchema.pre("save", async function (next) {
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
superAdminSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const SuperAdmin = model<ISuperAdminDocument>(
  "SuperAdmin",
  superAdminSchema
);

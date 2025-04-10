import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { IInstitute } from "../../types/auth.types";
import { InstituteType } from "../../constants/enums";

const instituteSchema = new Schema<IInstitute>(
  {
    instituteName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: Number,
      unique: true,
      required: [true, "Phone number is required"],
    },
    password: {
      type: String,
      required: true,
      minlength: [6, "Password must be at least 6 characters long"],
    },
    // Institution type and type-specific fields
    instituteType: {
      type: String,
      enum: Object.values(InstituteType),
      required: [true, "Institute type is required"],
    },
    msmeNumber: {
      type: String,
      required: function (this: IInstitute) {
        return this.instituteType === InstituteType.COACHING;
      },
      validate: {
        validator: function (this: IInstitute, value: string) {
          return this.instituteType !== InstituteType.COACHING || !!value;
        },
        message: "MSME number is required for coaching institutes",
      },
    },
    udiseNumber: {
      type: String,
      required: function (this: IInstitute) {
        return this.instituteType === InstituteType.SCHOOL;
      },
      validate: {
        validator: function (this: IInstitute, value: string) {
          return this.instituteType !== InstituteType.SCHOOL || !!value;
        },
        message: "UDISE number is required for schools",
      },
    },
    // idCardPhoto: {
    //   type: String,
    //   required: function(this: IInstituteDocument) {
    //     return this.instituteType === InstituteType.TUTOR;
    //   },
    //   validate: {
    //     validator: function(this: IInstituteDocument, value: string) {
    //       return this.instituteType !== InstituteType.TUTOR || !!value;
    //     },
    //     message: "ID card photo is required for tutors"
    //   }
    // },
    // Relationships
    courses: [
      {
        type: Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
  },
  {
    timestamps: true,
  }
);
// Indexes for query optimization
instituteSchema.index({ email: 1 });
instituteSchema.index({ phoneNumber: 1 });

// Pre-save hook to hash password
instituteSchema.pre("save", async function (next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified("password")) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

instituteSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};
export const InstituteAuth = model<IInstitute>(
  "InstituteAuth",
  instituteSchema
);

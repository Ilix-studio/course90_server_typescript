import { PasskeyStatus } from "../../constants/enums";
import { IPasskeyDocument } from "../../types/passkey.types";
import { model, Schema } from "mongoose";

const PasskeySchema = new Schema<IPasskeyDocument>(
  {
    passkeyId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "InstituteAuth",
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PasskeyStatus),
      default: PasskeyStatus.PENDING,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    activatedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
    },
    deviceId: {
      type: String,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for optimized queries
PasskeySchema.index({ instituteId: 1, courseId: 1 });
PasskeySchema.index({ passkeyId: 1, deviceId: 1 });
PasskeySchema.index({ status: 1, expiresAt: 1 });

// Set expiration date when activated
PasskeySchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status === PasskeyStatus.ACTIVE &&
    !this.expiresAt
  ) {
    if (!this.activatedAt) {
      this.activatedAt = new Date();
    }

    const expirationDate = new Date(this.activatedAt);
    expirationDate.setMonth(expirationDate.getMonth() + this.durationMonths);
    this.expiresAt = expirationDate;
  }

  next();
});

// Instance methods
PasskeySchema.methods.isValid = function (): boolean {
  return (
    this.status === PasskeyStatus.ACTIVE &&
    this.expiresAt !== undefined &&
    this.expiresAt > new Date()
  );
};

PasskeySchema.methods.getRemainingDays = function (): number {
  if (!this.expiresAt) return 0;

  const now = new Date();
  const diff = this.expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
};

// Static methods
PasskeySchema.statics.findActivePasskey = async function (
  passkeyId: string,
  deviceId: string
) {
  return this.findOne({
    passkeyId,
    deviceId,
    status: PasskeyStatus.ACTIVE,
    expiresAt: { $gt: new Date() },
  }).exec();
};

export const PasskeyModel = model<IPasskeyDocument>("Passkey", PasskeySchema);

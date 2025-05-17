import { PasskeyStatus } from "../../constants/enums";
import { IPasskeyDocument } from "../../types/passkey.types";
import mongoose, { model, Schema } from "mongoose";
import { subscriptionHistory } from "./subscriptionSchema";

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
    // Track subscription history for renewals
    subscriptionHistory: [subscriptionHistory],

    // Count of renewals
    renewalCount: {
      type: Number,
      default: 0,
    },

    // Auto-renewal flag
    autoRenewal: {
      type: Boolean,
      default: false,
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

/**
 * Method to renew a passkey
 */
PasskeySchema.methods.renew = async function (
  durationMonths: number,
  paymentId: mongoose.Types.ObjectId,
  amount: number
) {
  // Record previous subscription in history
  if (this.expiresAt) {
    this.subscriptionHistory.push({
      startDate: this.activatedAt || this.generatedAt,
      endDate: this.expiresAt,
      durationMonths: this.durationMonths,
      paymentId: this.paymentId,
      amount: amount,
    });
  }

  // Set new expiration date
  const startDate =
    this.status === PasskeyStatus.EXPIRED ? new Date() : this.expiresAt;
  const newExpirationDate = new Date(startDate);
  newExpirationDate.setMonth(newExpirationDate.getMonth() + durationMonths);
  // Update passkey details
  this.status = PasskeyStatus.ACTIVE;
  this.durationMonths = durationMonths;
  this.paymentId = paymentId;
  this.expiresAt = newExpirationDate;
  this.renewalCount += 1;

  // If previously expired, set new activatedAt date
  if (this.status === PasskeyStatus.EXPIRED) {
    this.activatedAt = new Date();
  }

  return this.save();
};
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

/**
 * Method to renew a passkey
 */
PasskeySchema.methods.renew = async function (
  durationMonths: number,
  paymentId: mongoose.Types.ObjectId,
  amount: number
) {
  // Record previous subscription in history
  if (this.expiresAt) {
    this.subscriptionHistory.push({
      startDate: this.activatedAt || this.generatedAt,
      endDate: this.expiresAt,
      durationMonths: this.durationMonths,
      paymentId: this.paymentId,
      amount: amount,
    });
  }

  // Set new expiration date
  const startDate =
    this.status === PasskeyStatus.EXPIRED ? new Date() : this.expiresAt;
  const newExpirationDate = new Date(startDate);
  newExpirationDate.setMonth(newExpirationDate.getMonth() + durationMonths);

  // Update passkey details
  this.status = PasskeyStatus.ACTIVE;
  this.durationMonths = durationMonths;
  this.paymentId = paymentId;
  this.expiresAt = newExpirationDate;
  this.renewalCount += 1;

  // If previously expired, set new activatedAt date
  if (this.status === PasskeyStatus.EXPIRED) {
    this.activatedAt = new Date();
  }

  return this.save();
};

/**
 * Model instance methods
 */
PasskeySchema.methods = {
  ...PasskeySchema.methods,

  /**
   * Check if the passkey is valid and active
   */
  isValid(): boolean {
    return (
      this.status === PasskeyStatus.ACTIVE &&
      this.expiresAt !== undefined &&
      this.expiresAt > new Date()
    );
  },

  /**
   * Get remaining days until expiration
   */
  getRemainingDays(): number {
    if (!this.expiresAt) return 0;

    const now = new Date();
    const diff = this.expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  },

  /**
   * Check if the passkey is eligible for renewal
   * (Active passkeys or recently expired passkeys)
   */
  isRenewable(): boolean {
    const now = new Date();

    // If active, always renewable
    if (this.status === PasskeyStatus.ACTIVE) {
      return true;
    }

    // If expired, check if it's within the grace period (30 days)
    if (this.status === PasskeyStatus.EXPIRED && this.expiresAt) {
      const gracePeriod = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      const timeSinceExpiration = now.getTime() - this.expiresAt.getTime();
      return timeSinceExpiration <= gracePeriod;
    }

    return false;
  },
};

/**
 * Model static methods
 */
PasskeySchema.statics = {
  /**
   * Find an active passkey by passkeyId and deviceId
   */
  async findActivePasskey(passkeyId: string, deviceId: string) {
    return this.findOne({
      passkeyId,
      deviceId,
      status: PasskeyStatus.ACTIVE,
      expiresAt: { $gt: new Date() },
    }).exec();
  },

  /**
   * Find a passkey eligible for renewal
   */
  async findRenewablePasskey(passkeyId: string) {
    const now = new Date();
    const gracePeriod = new Date(now);
    gracePeriod.setDate(gracePeriod.getDate() - 30); // 30 days grace period

    return this.findOne({
      passkeyId,
      $or: [
        { status: PasskeyStatus.ACTIVE },
        {
          status: PasskeyStatus.EXPIRED,
          expiresAt: { $gte: gracePeriod },
        },
      ],
    }).exec();
  },

  /**
   * Find all active passkeys for a student
   */
  async findStudentPasskeys(studentId: mongoose.Types.ObjectId) {
    return this.find({
      studentId,
      status: PasskeyStatus.ACTIVE,
      expiresAt: { $gt: new Date() },
    })
      .populate("courseId", "name description")
      .populate("instituteId", "instituteName")
      .sort({ expiresAt: 1 })
      .exec();
  },

  /**
   * Update expired passkeys
   * This could be run as a scheduled job
   */
  async updateExpiredPasskeys() {
    const now = new Date();
    return this.updateMany(
      {
        status: PasskeyStatus.ACTIVE,
        expiresAt: { $lte: now },
      },
      {
        $set: { status: PasskeyStatus.EXPIRED },
      }
    ).exec();
  },
};

export const PasskeyModel = model<IPasskeyDocument>("Passkey", PasskeySchema);

// src/models/Passkey.ts
import { PasskeyStatus } from "../../constants/enums";
import { IPasskeyDocument } from "../../types/passkey.types";
import mongoose, { Schema, model } from "mongoose";

/**
 * Mongoose schema for the Passkey model
 */
const PasskeySchema = new Schema<IPasskeyDocument>(
  {
    // Unique identifier for the passkey (used for authentication)
    passkeyId: {
      type: String,
      required: true,
      unique: true,
      index: true, // Optimize lookup by passkeyId
    },

    // The institute that generated this passkey
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },

    // The course this passkey grants access to
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    // Current status of the passkey
    status: {
      type: String,
      enum: Object.values(PasskeyStatus),
      default: PasskeyStatus.PENDING,
    },

    // Duration of the passkey validity in months
    durationMonths: {
      type: Number,
      required: true,
    },

    // When the passkey was generated
    generatedAt: {
      type: Date,
      default: Date.now,
    },

    // When the passkey was activated (after payment)
    activatedAt: {
      type: Date,
    },

    // When the passkey will expire
    expiresAt: {
      type: Date,
    },

    // The student who is using this passkey (if any)
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
    },

    // The device ID associated with this passkey
    deviceId: {
      type: String,
    },

    // Reference to the payment that activated this passkey
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes for query optimization
 */
PasskeySchema.index({ instituteId: 1, courseId: 1 });
PasskeySchema.index({ passkeyId: 1, deviceId: 1 });
PasskeySchema.index({ status: 1, expiresAt: 1 });

/**
 * Compound index for checking active passkeys
 */
PasskeySchema.index({
  status: 1,
  passkeyId: 1,
  expiresAt: 1,
});

/**
 * Pre-save middleware to set expiration date if activated
 */
PasskeySchema.pre("save", function (next) {
  // If the passkey is being activated for the first time
  if (
    this.isModified("status") &&
    this.status === PasskeyStatus.ACTIVE &&
    !this.expiresAt
  ) {
    // Set activatedAt to current time if not already set
    if (!this.activatedAt) {
      this.activatedAt = new Date();
    }

    // Calculate expiration date based on duration
    const expirationDate = new Date(this.activatedAt);
    expirationDate.setMonth(expirationDate.getMonth() + this.durationMonths);
    this.expiresAt = expirationDate;
  }

  next();
});

/**
 * Model instance methods
 */
PasskeySchema.methods = {
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

// Create and export the Passkey model
export const PasskeyModel = model<IPasskeyDocument>("Passkey", PasskeySchema);

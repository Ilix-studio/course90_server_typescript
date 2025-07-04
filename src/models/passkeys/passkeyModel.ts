// models/passkey/passkeyModel.ts
import { PasskeyStatus } from "../../constants/enums";

import mongoose, { model, Schema } from "mongoose";
import { subscriptionHistory } from "./subscriptionSchema";

/**
 * Platform fee payment schema - single source of truth
 */
export const platformFeePaymentSchema = new Schema(
  {
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2024,
    },
    amount: {
      type: Number,
      required: true,
      default: 90, // ₹90 standard platform fee
      min: 0,
    },
    paidBy: {
      type: String,
      enum: ["STUDENT", "INSTITUTE"],
      required: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },
    razorpayPaymentId: {
      type: String,
      sparse: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    _id: true,
  }
);

/**
 * Course access record schema - tracks institute's course fee verification
 */
export const courseAccessSchema = new Schema(
  {
    verifiedBy: {
      type: String,
      enum: ["INSTITUTE", "SYSTEM"],
      required: true,
    },
    verificationMethod: {
      type: String,
      enum: ["OFFLINE_PAYMENT", "MANUAL_APPROVAL", "ONLINE_PAYMENT"],
      required: true,
    },
    amount: {
      type: Number,
      min: 0,
    },
    paymentReference: {
      type: String,
      trim: true,
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    _id: true,
  }
);

/**
 * Status history schema - tracks passkey status changes
 */
export const statusHistorySchema = new Schema(
  {
    status: {
      type: String,
      enum: Object.values(PasskeyStatus),
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "statusHistory.changedByModel",
    },
    changedByModel: {
      type: String,
      enum: ["Principal", "Teacher", "System"],
      default: "Principal",
    },
    reason: {
      type: String,
      maxlength: 200,
    },
  },
  {
    timestamps: true,
    _id: true,
  }
);

// =====================================================
// MAIN PASSKEY SCHEMA
// =====================================================

const PasskeySchema = new Schema(
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
    packageType: {
      type: String,
      enum: ["NO_HEADACHE", "PAY_AND_GENERATE"],
      required: true,
    },
    durationMonths: {
      type: Number,
      enum: [1, 12],
      required: true,
    },

    // Student assignment
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      sparse: true,
    },
    deviceId: {
      type: String,
      trim: true,
      sparse: true,
    },
    assignedAt: {
      type: Date,
    },

    // Platform fee tracking (₹90/month) - YOUR REVENUE
    platformFeePayments: [platformFeePaymentSchema],
    currentPlatformFeeStatus: {
      type: String,
      enum: ["PAID", "PENDING", "OVERDUE"],
      default: "PENDING",
    },
    nextPlatformFeeDue: {
      type: Date,
      required: true,
    },

    // Course access tracking (Institute's revenue)
    courseAccess: [courseAccessSchema],
    hasCourseAccess: {
      type: Boolean,
      default: false,
    },
    courseAccessNotes: {
      type: String,
      maxlength: 500,
    },

    // Status tracking
    status: {
      type: String,
      enum: Object.values(PasskeyStatus),
      default: PasskeyStatus.GENERATED,
    },
    statusHistory: [statusHistorySchema],

    // Lifecycle dates
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
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Principal",
      required: true,
    },

    // Usage tracking
    lastAccessedAt: {
      type: Date,
    },
    accessCount: {
      type: Number,
      default: 0,
    },

    // Payment reference
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },

    // Subscription management
    subscriptionHistory: [subscriptionHistory],
    renewalCount: {
      type: Number,
      default: 0,
    },
    autoRenewal: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// =====================================================
// INDEXES FOR PERFORMANCE
// =====================================================

PasskeySchema.index({ instituteId: 1, courseId: 1 });
PasskeySchema.index({ passkeyId: 1, deviceId: 1 }, { sparse: true });
PasskeySchema.index({ status: 1, expiresAt: 1 });
PasskeySchema.index({ studentId: 1 }, { sparse: true });
PasskeySchema.index({ nextPlatformFeeDue: 1, currentPlatformFeeStatus: 1 });
PasskeySchema.index({ packageType: 1, status: 1 });

// Compound indexes for complex queries
PasskeySchema.index({
  instituteId: 1,
  status: 1,
  currentPlatformFeeStatus: 1,
});

// =====================================================
// VIRTUAL FIELDS
// =====================================================

/**
 * Check if passkey is revenue generating
 */
PasskeySchema.virtual("isRevenueGenerating").get(function () {
  return (
    this.status === PasskeyStatus.FULLY_ACTIVE &&
    this.currentPlatformFeeStatus === "PAID" &&
    this.hasCourseAccess
  );
});

/**
 * Get total platform revenue from this passkey
 */
PasskeySchema.virtual("totalPlatformRevenue").get(function () {
  return this.platformFeePayments
    .filter((payment) => payment.paidAt)
    .reduce((total, payment) => total + payment.amount, 0);
});

/**
 * Check if platform fee is overdue
 */
PasskeySchema.virtual("isPlatformFeeOverdue").get(function () {
  return (
    this.nextPlatformFeeDue &&
    new Date() > this.nextPlatformFeeDue &&
    this.currentPlatformFeeStatus !== "PAID"
  );
});

// =====================================================
// PRE-SAVE MIDDLEWARE
// =====================================================

// Set expiration date when activated
PasskeySchema.pre("save", function (next) {
  // Set expiration date when status changes to ACTIVE
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

  // Add status change to history
  if (this.isModified("status")) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      changedBy: this.generatedBy, // Default to who generated it
      reason: `Status changed to ${this.status}`,
    });
  }

  // Update platform fee status based on payments
  if (this.isModified("platformFeePayments")) {
    const latestPayment = this.platformFeePayments.sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
    )[0];

    if (latestPayment && latestPayment.expiresAt > new Date()) {
      this.currentPlatformFeeStatus = "PAID";
      this.nextPlatformFeeDue = latestPayment.expiresAt;
    } else {
      this.currentPlatformFeeStatus = "PENDING";
    }
  }

  next();
});

// =====================================================
// INSTANCE METHODS
// =====================================================

PasskeySchema.methods = {
  /**
   * Method to renew a passkey
   */
  renew: async function (
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
  },

  /**
   * Check if the passkey is valid and active
   */
  isValid: function (): boolean {
    return (
      this.status === PasskeyStatus.ACTIVE &&
      this.expiresAt !== undefined &&
      this.expiresAt > new Date()
    );
  },

  /**
   * Get remaining days until expiration
   */
  getRemainingDays: function (): number {
    if (!this.expiresAt) return 0;

    const now = new Date();
    const diff = this.expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  },

  /**
   * Check if the passkey is eligible for renewal
   */
  isRenewable: function (): boolean {
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

  /**
   * Update access tracking
   */
  trackAccess: async function () {
    this.lastAccessedAt = new Date();
    this.accessCount += 1;
    return this.save();
  },

  /**
   * Add platform fee payment
   */
  addPlatformFeePayment: async function (paymentDetails: {
    paymentId: mongoose.Types.ObjectId;
    razorpayPaymentId?: string;
    amount: number;
    paidBy: "STUDENT" | "INSTITUTE";
    durationMonths: number;
  }) {
    const currentDate = new Date();
    const expiresAt = new Date(currentDate);
    expiresAt.setMonth(expiresAt.getMonth() + paymentDetails.durationMonths);

    this.platformFeePayments.push({
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      amount: paymentDetails.amount,
      paidBy: paymentDetails.paidBy,
      paymentId: paymentDetails.paymentId,
      razorpayPaymentId: paymentDetails.razorpayPaymentId,
      paidAt: currentDate,
      expiresAt: expiresAt,
    });

    // Update status
    this.currentPlatformFeeStatus = "PAID";
    this.nextPlatformFeeDue = expiresAt;

    return this.save();
  },

  /**
   * Verify course access
   */
  verifyCourseAccess: async function (accessDetails: {
    verifiedBy: "INSTITUTE" | "SYSTEM";
    verificationMethod:
      | "OFFLINE_PAYMENT"
      | "MANUAL_APPROVAL"
      | "ONLINE_PAYMENT";
    amount?: number;
    paymentReference?: string;
    notes?: string;
  }) {
    this.courseAccess.push({
      verifiedBy: accessDetails.verifiedBy,
      verificationMethod: accessDetails.verificationMethod,
      amount: accessDetails.amount,
      paymentReference: accessDetails.paymentReference,
      verifiedAt: new Date(),
      notes: accessDetails.notes,
    });

    this.hasCourseAccess = true;

    // Update status to FULLY_ACTIVE if both platform fee and course access are confirmed
    if (this.currentPlatformFeeStatus === "PAID" && this.hasCourseAccess) {
      this.status = PasskeyStatus.FULLY_ACTIVE;
    }

    return this.save();
  },
};

// =====================================================
// STATIC METHODS
// =====================================================

PasskeySchema.statics = {
  /**
   * Find an active passkey by passkeyId and deviceId
   */
  findActivePasskey: async function (passkeyId: string, deviceId: string) {
    return this.findOne({
      passkeyId,
      deviceId,
      status: { $in: [PasskeyStatus.ACTIVE, PasskeyStatus.FULLY_ACTIVE] },
      expiresAt: { $gt: new Date() },
    }).exec();
  },

  /**
   * Find a passkey eligible for renewal
   */
  findRenewablePasskey: async function (passkeyId: string) {
    const now = new Date();
    const gracePeriod = new Date(now);
    gracePeriod.setDate(gracePeriod.getDate() - 30); // 30 days grace period

    return this.findOne({
      passkeyId,
      $or: [
        { status: { $in: [PasskeyStatus.ACTIVE, PasskeyStatus.FULLY_ACTIVE] } },
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
  findStudentPasskeys: async function (studentId: mongoose.Types.ObjectId) {
    return this.find({
      studentId,
      status: { $in: [PasskeyStatus.ACTIVE, PasskeyStatus.FULLY_ACTIVE] },
      expiresAt: { $gt: new Date() },
    })
      .populate("courseId", "name description")
      .populate("instituteId", "instituteName")
      .sort({ expiresAt: 1 })
      .exec();
  },

  /**
   * Update expired passkeys
   */
  updateExpiredPasskeys: async function () {
    const now = new Date();
    return this.updateMany(
      {
        status: { $in: [PasskeyStatus.ACTIVE, PasskeyStatus.FULLY_ACTIVE] },
        expiresAt: { $lte: now },
      },
      {
        $set: { status: PasskeyStatus.EXPIRED },
      }
    ).exec();
  },

  /**
   * Find passkeys with overdue platform fees
   */
  findOverduePlatformFees: function () {
    return this.find({
      nextPlatformFeeDue: { $lt: new Date() },
      currentPlatformFeeStatus: { $ne: "PAID" },
      status: { $nin: [PasskeyStatus.EXPIRED, PasskeyStatus.REVOKED] },
    });
  },

  /**
   * Get platform revenue summary
   */
  getPlatformRevenueSummary: function (instituteId?: string) {
    const matchStage: any = {};
    if (instituteId) {
      matchStage.instituteId = new mongoose.Types.ObjectId(instituteId);
    }

    return this.aggregate([
      { $match: matchStage },
      { $unwind: "$platformFeePayments" },
      {
        $group: {
          _id: {
            paidBy: "$platformFeePayments.paidBy",
            month: "$platformFeePayments.month",
            year: "$platformFeePayments.year",
          },
          totalRevenue: { $sum: "$platformFeePayments.amount" },
          paymentCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          totalPlatformRevenue: { $sum: "$totalRevenue" },
          totalPayments: { $sum: "$paymentCount" },
          revenueByPayer: {
            $push: {
              paidBy: "$_id.paidBy",
              amount: "$totalRevenue",
              count: "$paymentCount",
            },
          },
        },
      },
    ]);
  },

  /**
   * Find students who need to pay platform fee
   */
  findStudentsNeedingPlatformFee: function (instituteId?: string) {
    const query: any = {
      studentId: { $exists: true },
      currentPlatformFeeStatus: "PENDING",
      status: { $nin: [PasskeyStatus.EXPIRED, PasskeyStatus.REVOKED] },
    };

    if (instituteId) {
      query.instituteId = instituteId;
    }

    return this.find(query)
      .populate("studentId", "name email phoneNumber")
      .populate("courseId", "name")
      .populate("instituteId", "instituteName");
  },
};

export const PasskeyModel = model("Passkey", PasskeySchema);

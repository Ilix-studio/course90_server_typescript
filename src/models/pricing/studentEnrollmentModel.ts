import { Schema, model } from "mongoose";
import { IStudentEnrollment } from "../../types/pricing.types";
import { CurrencyCode } from "../../constants/enums";

const studentEnrollmentSchema = new Schema<IStudentEnrollment>(
  {
    studentId: {
      type: String,
      ref: "Student",
      required: [true, "Student ID is required"],
    },

    courseId: {
      type: String,
      ref: "Course",
      required: [true, "Course ID is required"],
    },

    instituteId: {
      type: String,
      ref: "Principal",
      required: [true, "Institute ID is required"],
    },

    amountPaid: {
      type: Number,
      required: [true, "Amount paid is required"],
      min: [0, "Amount paid cannot be negative"],
    },

    currency: {
      type: String,
      enum: Object.values(CurrencyCode),
      required: [true, "Currency is required"],
    },

    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      enum: ["razorpay", "manual", "free", "trial"],
    },

    enrolledAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      validate: {
        validator: function (
          this: IStudentEnrollment,
          value: Date | undefined
        ) {
          return !value || value > this.enrolledAt;
        },
        message: "Expiry date must be after enrollment date",
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    paymentId: {
      type: String,
      ref: "Payment",
    },

    razorpayOrderId: {
      type: String,
      trim: true,
    },

    razorpayPaymentId: {
      type: String,
      trim: true,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
studentEnrollmentSchema.index({ studentId: 1 });
studentEnrollmentSchema.index({ courseId: 1 });
studentEnrollmentSchema.index({ instituteId: 1 });
studentEnrollmentSchema.index({ isActive: 1 });
studentEnrollmentSchema.index({ enrolledAt: 1 });
studentEnrollmentSchema.index({ expiresAt: 1 });

// Compound indexes
studentEnrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
studentEnrollmentSchema.index({ studentId: 1, isActive: 1 });
studentEnrollmentSchema.index({ courseId: 1, isActive: 1 });
studentEnrollmentSchema.index({ instituteId: 1, isActive: 1 });

// Methods
studentEnrollmentSchema.methods = {
  // Check if enrollment is currently active
  isCurrentlyActive: function () {
    return this.isActive && (!this.expiresAt || this.expiresAt > new Date());
  },

  // Check if trial has expired
  isTrialExpired: function () {
    return (
      this.isTrialEnrollment &&
      this.trialEndsAt &&
      this.trialEndsAt <= new Date()
    );
  },

  // Convert trial to paid enrollment
  convertTrial: async function (amountPaid: number, paymentId: string) {
    this.isTrialEnrollment = false;
    this.trialConverted = true;
    this.amountPaid = amountPaid;
    this.paymentId = paymentId;
    this.paymentMethod = "razorpay";
    return this.save();
  },

  // Extend enrollment
  extend: async function (additionalMonths: number) {
    const currentExpiry = this.expiresAt || new Date();
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + additionalMonths);
    this.expiresAt = newExpiry;
    return this.save();
  },
};

export const StudentEnrollment = model<IStudentEnrollment>(
  "StudentEnrollment",
  studentEnrollmentSchema
);

// models/passkey/subscriptionSchema.ts
import { ISubscriptionHistory } from "../../types/passkey.types";
import { Schema } from "mongoose";

/**
 * Subscription history schema - tracks passkey renewals and subscription periods
 * This schema is embedded in the main Passkey model
 */
export const subscriptionHistory = new Schema<ISubscriptionHistory>(
  {
    startDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value: Date) {
          return value <= new Date();
        },
        message: "Start date cannot be in the future",
      },
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (this: ISubscriptionHistory, value: Date) {
          return value > this.startDate;
        },
        message: "End date must be after start date",
      },
    },
    durationMonths: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      validate: {
        validator: function (this: ISubscriptionHistory, value: number) {
          // Validate that duration matches the date difference
          const monthsDiff = Math.round(
            (this.endDate.getTime() - this.startDate.getTime()) /
              (1000 * 60 * 60 * 24 * 30)
          );
          return Math.abs(monthsDiff - value) <= 1; // Allow 1 month tolerance for date calculations
        },
        message: "Duration months must match the actual date difference",
      },
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      required: false, // Not required for free periods or institute-covered periods
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (this: ISubscriptionHistory, value: number) {
          // If there's a paymentId, amount should be > 0
          if (this.paymentId && value <= 0) {
            return false;
          }
          return true;
        },
        message: "Amount must be greater than 0 when payment is involved",
      },
    },
  },
  {
    _id: true,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field to check if subscription is currently active
subscriptionHistory
  .virtual("isCurrent")
  .get(function (this: ISubscriptionHistory) {
    const now = new Date();
    return now >= this.startDate && now <= this.endDate;
  });

// Virtual field to get subscription duration in days
subscriptionHistory
  .virtual("durationDays")
  .get(function (this: ISubscriptionHistory) {
    const timeDiff = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  });

// Index for efficient queries
subscriptionHistory.index({ startDate: 1, endDate: 1 });
subscriptionHistory.index({ isActive: 1 });
subscriptionHistory.index({ paymentId: 1 });

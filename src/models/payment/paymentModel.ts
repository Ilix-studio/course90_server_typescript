// src/models/Payment.ts
import { PaymentStatus } from "@/constants/enums";
import { IPaymentDocument } from "../../types/payment.types";
import { Schema, model } from "mongoose";

/**
 * Mongoose schema for the Payment model
 */
const PaymentSchema = new Schema<IPaymentDocument>(
  {
    // The passkey this payment is for
    passkeyId: {
      type: String,
      required: true,
      index: true,
    },

    // Razorpay order ID
    orderId: {
      type: String,
      required: true,
      unique: true,
    },

    // Razorpay payment ID (received after successful payment)
    paymentId: {
      type: String,
      sparse: true, // Allow multiple null values
      unique: true,
    },

    // Razorpay signature (for verification)
    signature: {
      type: String,
    },

    // Amount in rupees
    amount: {
      type: Number,
      required: true,
    },

    // The institute receiving the payment
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },

    // The course being purchased
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    // Duration in months for the passkey
    durationMonths: {
      type: Number,
      required: true,
    },

    // Current status of the payment
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.CREATED,
    },

    // Student making the payment (if available)
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
    },

    // Student's device ID
    deviceId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes for query optimization
 */
PaymentSchema.index({ instituteId: 1, status: 1 });
PaymentSchema.index({ passkeyId: 1, status: 1 });
PaymentSchema.index({ createdAt: 1 });

/**
 * Model static methods
 */
PaymentSchema.statics = {
  /**
   * Find a payment by orderId
   */
  async findByOrderId(orderId: string) {
    return this.findOne({ orderId }).exec();
  },

  /**
   * Find a payment by paymentId
   */
  async findByPaymentId(paymentId: string) {
    return this.findOne({ paymentId }).exec();
  },

  /**
   * Find all payments for an institute
   */
  async findByInstitute(instituteId: string, status?: PaymentStatus) {
    const query: any = { instituteId };

    if (status) {
      query.status = status;
    }

    return this.find(query).sort({ createdAt: -1 }).exec();
  },

  /**
   * Calculate total revenue for an institute
   */
  async calculateInstituteTotalRevenue(instituteId: string) {
    const result = await this.aggregate([
      {
        $match: {
          instituteId,
          status: PaymentStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
        },
      },
    ]).exec();

    return result.length > 0 ? result[0].totalRevenue : 0;
  },

  /**
   * Get payment statistics for an institute
   */
  async getInstitutePaymentStats(instituteId: string) {
    // Get completed payment count and total revenue
    const completedPayments = await this.aggregate([
      {
        $match: {
          instituteId,
          status: PaymentStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalRevenue: { $sum: "$amount" },
        },
      },
    ]).exec();

    // Get failed payment count
    const failedPayments = await this.countDocuments({
      instituteId,
      status: PaymentStatus.FAILED,
    });

    // Get pending payment count
    const pendingPayments = await this.countDocuments({
      instituteId,
      status: PaymentStatus.CREATED,
    });

    return {
      completed: completedPayments.length > 0 ? completedPayments[0].count : 0,
      failed: failedPayments,
      pending: pendingPayments,
      totalRevenue:
        completedPayments.length > 0 ? completedPayments[0].totalRevenue : 0,
    };
  },
};

// Create and export the Payment model
export const PaymentModel = model<IPaymentDocument>("Payment", PaymentSchema);

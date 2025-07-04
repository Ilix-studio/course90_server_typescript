import { Schema, model, Document } from "mongoose";
import { IPayment } from "../../types/payment.types";
import { PaymentStatus } from "../../constants/enums";

// Extend the document with MongoDB specific fields
export interface IPaymentDocument extends IPayment, Document {
  _id: any;
  __v: number;
}

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    razorpaySignature: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    instituteId: {
      type: String,
      required: true,
    },
    courseId: {
      type: String,
      required: true,
    },
    passkeyId: {
      type: String,
      required: true,
    },
    durationMonths: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.CREATED,
    },
    studentId: {
      type: String,
    },
    deviceId: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    platformFee: {
      type: Number,
      required: true,
      default: 90,
    },
    courseFee: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for optimized queries
PaymentSchema.index({ instituteId: 1 });
PaymentSchema.index({ courseId: 1 });
PaymentSchema.index({ passkeyId: 1 });
PaymentSchema.index({ status: 1 });

export const PaymentModel = model<IPaymentDocument>("Payment", PaymentSchema);

import { Schema, model } from "mongoose";
import { IPaymentDocument } from "../../types/payment.types";
import { PaymentStatus } from "../../constants/enums";

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
      type: Schema.Types.ObjectId,
      ref: "InstituteAuth",
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
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
      type: Schema.Types.ObjectId,
      ref: "Student",
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

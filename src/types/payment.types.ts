import { Document, Types } from "mongoose";
import { PaymentStatus } from "../constants/enums";

export interface IPayment {
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;
  instituteId: Types.ObjectId;
  courseId: Types.ObjectId;
  passkeyId: string;
  durationMonths: number;
  status: PaymentStatus;
  studentId?: Types.ObjectId;
  deviceId?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface IPaymentDocument extends IPayment, Document {
  _id: string;
}

export interface CreateOrderRequest {
  passkeyId: string;
  courseId: string;
  durationMonths: number;
  deviceId: string;
}

export interface VerifyPaymentRequest {
  orderId: string;
  paymentId: string;
  signature: string;
  passkeyId: string;
}

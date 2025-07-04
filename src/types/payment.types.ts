import { Document } from "mongoose";
import { PaymentStatus, PaymentType, CurrencyCode } from "../constants/enums";

// Payment Interface
export interface IPayment {
  passkeyId: string;
  courseId: string;
  studentId?: string;
  instituteId: string;
  deviceId: string; // Device used for payment
  amount: number;
  currency: CurrencyCode;
  paymentType: PaymentType;
  status: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  transactionId?: string;
  transactionDate: Date;
  metadata?: any;
  completedAt: Date;
  razorpaySignature: string;
  durationMonths: number;
  createdAt: Date;
  platformFee: number;
  courseFee: number;
}

// For Mongoose Document
export interface IPaymentDocument extends IPayment, Document {
  _id: any;
  __v: number;
}

// API Request Types
export interface CreatePaymentRequest {
  passkeyId: string;
  courseId: string;
  studentId: string;
  deviceId: string;
  amount: number;
  paymentType: PaymentType;
}

export interface CreateOrderRequest {
  passkeyId: string;
  courseId: string;
  studentId?: string;
  deviceId: string;
  amount: number;
  durationMonths: number;
  currency: CurrencyCode;
  paymentType: PaymentType;
}

export interface VerifyPaymentRequest {
  passkeyId: string;
  razorpayOrderId: string;
  orderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  deviceId: string;
}

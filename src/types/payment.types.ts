import { Document, Types } from "mongoose";
import { PaymentStatus } from "../constants/enums";

/**
 * Interface representing the structure of a payment in the database
 */
export interface IPayment {
  // The passkey this payment is for
  passkeyId: string;

  // Razorpay order ID
  orderId: string;

  // Razorpay payment ID (received after successful payment)
  paymentId?: string;

  // Razorpay signature (for verification)
  signature?: string;

  // Amount in rupees
  amount: number;

  // The institute receiving the payment
  instituteId: Types.ObjectId;

  // The course being purchased
  courseId: Types.ObjectId;

  // Duration in months for the passkey
  durationMonths: number;

  // Current status of the payment
  status: PaymentStatus;

  // Student making the payment (if available)
  studentId?: Types.ObjectId;

  // Student's device ID
  deviceId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface extending IPayment with Mongoose Document properties
 */
export interface IPaymentDocument extends IPayment, Document {
  _id: string;
}

/**
 * Interface for creating payment order request
 */
export interface CreatePaymentOrderRequest {
  // The passkey to activate
  passkeyId: string;

  // Duration in months
  durationMonths: number;

  // Student's device ID
  deviceId: string;
}

/**
 * Interface for Razorpay order creation response
 */
export interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

/**
 * Interface for payment verification request
 */
export interface VerifyPaymentRequest {
  // Razorpay payment details returned from client
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;

  // The passkey associated with this payment
  passkeyId: string;

  // Duration in months
  durationMonths: number;

  // Student's device ID
  deviceId: string;
}

/**
 * Interface for payment response
 */
export interface PaymentResponse {
  _id: string;
  passkeyId: string;
  orderId: string;
  paymentId?: string;
  amount: number;
  status: PaymentStatus;
  durationMonths: number;
  createdAt: Date;
}

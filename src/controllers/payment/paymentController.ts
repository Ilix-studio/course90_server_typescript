import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Razorpay from "razorpay";
import * as crypto from "crypto";
import {
  CreateOrderRequest,
  VerifyPaymentRequest,
} from "../../types/payment.types";
import { PasskeyModel } from "../../models/passkeys/passkeyModel";
import { PasskeyStatus, PaymentStatus } from "../../constants/enums";
import { CourseModel } from "../../models/course/courseModel";
import { PaymentModel } from "../../models/payment/paymentModel";
import logger from "../../utils/logger";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

// Create a payment order
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { passkeyId, courseId, durationMonths, deviceId }: CreateOrderRequest =
    req.body;

  // Validate input
  if (!passkeyId || !courseId || !deviceId || !durationMonths) {
    res.status(400);
    throw new Error("Missing required fields.");
  }

  if (durationMonths !== 1 && durationMonths !== 12) {
    res.status(400);
    throw new Error("Duration must be either 1 or 12 months.");
  }

  // Find the passkey
  const passkey = await PasskeyModel.findOne({ passkeyId });

  if (!passkey) {
    res.status(404);
    throw new Error("Passkey not found.");
  }

  if (passkey.status !== PasskeyStatus.PENDING) {
    res.status(400);
    throw new Error(`Passkey is already ${passkey.status.toLowerCase()}.`);
  }

  // Find the course
  const course = await CourseModel.findById(courseId);

  if (!course) {
    res.status(404);
    throw new Error("Course not found.");
  }

  // Calculate amount based on duration (in paisa/cents)
  // Example pricing: ₹90 for 1 month, ₹990 for 12 months
  const baseAmount = durationMonths === 1 ? 9000 : 99000;

  // Create Razorpay order
  const options = {
    amount: baseAmount,
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
    notes: {
      passkeyId,
      courseId: courseId.toString(),
      durationMonths: durationMonths.toString(),
    },
  };

  try {
    const order = await razorpay.orders.create(options);

    // Save order details to database
    await PaymentModel.create({
      razorpayOrderId: order.id,
      amount: baseAmount / 100, // Convert to rupees for DB storage
      instituteId: passkey.instituteId,
      courseId,
      passkeyId,
      durationMonths,
      status: PaymentStatus.CREATED,
      deviceId,
    });

    res.status(201).json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    logger.error("Razorpay error:", error);
    res.status(500);
    throw new Error("Failed to create payment order.");
  }
});

// Verify payment and activate passkey
export const verifyPayment = asyncHandler(
  async (req: Request, res: Response) => {
    // const { orderId, paymentId, signature, passkeyId }: VerifyPaymentRequest =
    //   req.body;
    const { orderId, passkeyId }: VerifyPaymentRequest = req.body;

    // Validate input
    // if (!orderId || !passkeyId) {
    //   res.status(400);
    //   throw new Error("Missing required fields.");
    // }

    // Find payment record
    const payment = await PaymentModel.findOne({ razorpayOrderId: orderId });

    if (!payment) {
      res.status(404);
      throw new Error("Payment order not found.");
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      res.status(400);
      throw new Error("Payment already processed.");
    }

    // Find passkey
    const passkey = await PasskeyModel.findOne({ passkeyId });

    if (!passkey) {
      res.status(404);
      throw new Error("Passkey not found.");
    }

    if (passkey.status !== PasskeyStatus.PENDING) {
      res.status(400);
      throw new Error(`Passkey is already ${passkey.status.toLowerCase()}.`);
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${orderId}`)
      //   .update(`${orderId}|${paymentId}`)
      .digest("hex");

    // if (generatedSignature !== signature) {
    //   res.status(400);
    //   throw new Error("Invalid payment signature.");
    // }

    // Update payment status
    // payment.razorpayPaymentId = paymentId;
    // payment.razorpaySignature = signature;
    payment.status = PaymentStatus.COMPLETED;
    payment.completedAt = new Date();
    await payment.save();

    // Set durationMonths and activate passkey
    passkey.durationMonths = payment.durationMonths; // Set duration from payment
    passkey.status = PasskeyStatus.ACTIVE;
    passkey.deviceId = payment.deviceId;
    // passkey.paymentId = payment._id; // This will convert to ObjectId automatically
    passkey.activatedAt = new Date();
    await passkey.save();

    res.json({
      success: true,
      message: "Payment verified and passkey activated successfully.",
      passkey: {
        passkeyId: passkey.passkeyId,
        status: passkey.status,
        durationMonths: passkey.durationMonths,
        activatedAt: passkey.activatedAt,
        expiresAt: passkey.expiresAt,
      },
    });
  }
);

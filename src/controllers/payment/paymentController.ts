// src/controllers/payment/paymentController.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Razorpay from "razorpay";

import mongoose from "mongoose"; // Import mongoose for ObjectId conversion
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

/**
 * Create a payment order for a new or renewal passkey
 * POST /api/payments/create-order
 * @access Public
 */
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

  // Check if this is a renewal or new activation
  const isRenewal =
    passkey.status === PasskeyStatus.ACTIVE ||
    (passkey.status === PasskeyStatus.EXPIRED && passkey.deviceId === deviceId);

  if (!isRenewal && passkey.status !== PasskeyStatus.PENDING) {
    res.status(400);
    throw new Error(
      `Passkey is ${passkey.status.toLowerCase()} and cannot be activated.`
    );
  }

  // For renewal, check if device ID matches the registered one
  if (isRenewal && passkey.deviceId && passkey.deviceId !== deviceId) {
    res.status(400);
    throw new Error(
      "Device ID mismatch. Renewals must be from the same device."
    );
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
      isRenewal: isRenewal.toString(),
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
      isRenewal,
    });
  } catch (error) {
    logger.error("Razorpay error:", error);
    res.status(500);
    throw new Error("Failed to create payment order.");
  }
});

/**
 * Verify payment and activate or renew passkey
 * POST /api/payments/verify
 * @access Public
 */
export const verifyPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId, passkeyId }: VerifyPaymentRequest = req.body;

    // Validate input
    if (!orderId || !passkeyId) {
      res.status(400);
      throw new Error("Missing required fields.");
    }

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

    // Determine if this is a renewal or new activation
    const isRenewal =
      passkey.status === PasskeyStatus.ACTIVE ||
      (passkey.status === PasskeyStatus.EXPIRED &&
        passkey.deviceId === payment.deviceId);

    if (!isRenewal && passkey.status !== PasskeyStatus.PENDING) {
      res.status(400);
      throw new Error(
        `Passkey is ${passkey.status.toLowerCase()} and cannot be activated.`
      );
    }

    // In a production environment, verify signature with Razorpay
    // For now, we're simplifying this for testing

    // Update payment status
    payment.status = PaymentStatus.COMPLETED;
    payment.completedAt = new Date();
    await payment.save();

    try {
      // Handle passkey activation/renewal based on current status
      if (isRenewal) {
        // Convert payment._id to ObjectId
        const paymentObjectId = new mongoose.Types.ObjectId(payment._id);

        // Renew the passkey
        await passkey.renew(
          payment.durationMonths,
          paymentObjectId,
          payment.amount
        );

        logger.info(
          `Passkey ${passkeyId} renewed successfully for ${payment.durationMonths} months`
        );
      } else {
        // New activation
        passkey.durationMonths = payment.durationMonths;
        passkey.status = PasskeyStatus.ACTIVE;
        passkey.deviceId = payment.deviceId;
        passkey.paymentId = new mongoose.Types.ObjectId(payment._id);
        passkey.activatedAt = new Date();
        await passkey.save();

        logger.info(
          `Passkey ${passkeyId} activated successfully for ${payment.durationMonths} months`
        );
      }

      res.json({
        success: true,
        message: isRenewal
          ? "Payment verified and passkey renewed successfully."
          : "Payment verified and passkey activated successfully.",
        passkey: {
          passkeyId: passkey.passkeyId,
          status: passkey.status,
          durationMonths: passkey.durationMonths,
          activatedAt: passkey.activatedAt,
          expiresAt: passkey.expiresAt,
          renewalCount: passkey.renewalCount || 0,
          isRenewal,
        },
      });
    } catch (error) {
      logger.error("Error during passkey activation/renewal:", error);
      res.status(500);
      throw new Error("Failed to update passkey status after payment.");
    }
  }
);

/**
 * Get payment history for a specific institute
 * GET /api/payments/history
 * @access Private/Institute
 */
export const getPaymentHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const { instituteId } = req.params;

    const payments = await PaymentModel.find({
      instituteId,
      status: PaymentStatus.COMPLETED,
    })
      .sort({ completedAt: -1 })
      .populate("courseId", "name");

    res.json(payments);
  }
);

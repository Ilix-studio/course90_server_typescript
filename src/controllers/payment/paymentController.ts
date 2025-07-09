import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { PaymentModel } from "../../models/payment/paymentModel";
import { PasskeyModel } from "../../models/passkeys/passkeyModel";
import { CoursePricing } from "../../models/pricing/coursePricingModel";
import {
  PaymentStatus,
  PaymentType,
  PasskeyStatus,
} from "../../constants/enums";
import {
  CreateOrderRequest,
  VerifyPaymentRequest,
} from "../../types/payment.types";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../../routes/payment/razorpayService";

// @desc    Create Payment Order
// @route   POST /api/v2/payments/create-order
// @access  Private (Student)
export const createOrder = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      passkeyId,
      courseId,

      deviceId,
      amount,
      currency,
      paymentType,

      durationMonths,
    }: CreateOrderRequest = req.body;

    // Verify passkey exists
    const passkey = await PasskeyModel.findOne({
      passkeyId,
      courseId,
    });

    if (!passkey) {
      res.status(404);
      throw new Error("Passkey not found or not assigned to this student");
    }

    // Verify course pricing
    const pricing = await CoursePricing.findOne({
      courseId,
      isActive: true,
    });

    if (!pricing) {
      res.status(404);
      throw new Error("Course pricing not found");
    }

    // Create Razorpay order
    const orderId = `order_${passkeyId}_${Date.now()}`;
    const razorpayOrder = await createRazorpayOrder({
      amount: amount * 100, // Convert to paise
      currency,
      receipt: orderId,
      notes: {
        passkeyId,
        courseId,

        paymentType,
      },
    });

    // Save payment record
    const payment = await PaymentModel.create({
      razorpayOrderId: razorpayOrder.id,
      amount,
      instituteId: pricing.instituteId,
      courseId,
      passkeyId,
      durationMonths: durationMonths || passkey.durationMonths || 1,
      status: PaymentStatus.CREATED,
      passkey,
      deviceId,
      platformFee: 90, // Default platform fee
      courseFee: amount - 90, // Remaining is course fee
    });

    res.status(201).json({
      success: true,
      message: "Payment order created successfully",
      data: {
        order: {
          id: payment._id,
          razorpayOrderId: razorpayOrder.id,
          amount,
          currency,
        },
        payment: {
          id: payment._id,
          status: payment.status,
        },
        razorpay: {
          key: process.env.RAZORPAY_KEY_ID,
          orderId: razorpayOrder.id,
          prefill: {
            name: "Student",
            email: "student@example.com",
            contact: "",
          },
          theme: {
            color: "#3399cc",
          },
        },
      },
    });
  }
);

// @desc    Verify Payment
// @route   POST /api/v2/payments/verify
// @access  Public
export const verifyPayment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      passkeyId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      deviceId,
    }: VerifyPaymentRequest = req.body;

    // Verify Razorpay signature
    const isValid = verifyRazorpayPayment({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      res.status(400);
      throw new Error("Invalid payment signature");
    }

    // Update payment record
    const payment = await PaymentModel.findOne({ razorpayOrderId });

    if (!payment) {
      res.status(404);
      throw new Error("Payment not found");
    }

    // Update payment status
    payment.status = PaymentStatus.COMPLETED;
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.completedAt = new Date();

    // Update passkey status
    const passkey = await PasskeyModel.findOne({ passkeyId });

    if (!passkey) {
      res.status(404);
      throw new Error("Passkey not found");
    }

    // Calculate expiry based on payment duration
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + payment.durationMonths);
    passkey.expiresAt = expiryDate;

    // Update passkey status based on payment type
    if (payment.paymentType === PaymentType.PLATFORM_FEE) {
      passkey.status = PasskeyStatus.PLATFORM_FEE_PAID;
    } else if (payment.paymentType === PaymentType.COURSE_FEE) {
      // Keep existing status or update to course access pending
      if (passkey.status !== PasskeyStatus.PLATFORM_FEE_PAID) {
        passkey.status = PasskeyStatus.COURSE_ACCESS_PENDING;
      }
    } else if (payment.paymentType === PaymentType.COMBINED) {
      passkey.status = PasskeyStatus.FULLY_ACTIVE;
    }

    // Add to status history
    passkey.statusHistory = passkey.statusHistory || [];
    passkey.statusHistory.push({
      status: passkey.status,
      changedAt: new Date(),
      changedBy: payment.studentId,
      reason: `Payment completed for ${PaymentType[payment.paymentType]}`,
    });

    // Save changes
    await Promise.all([payment.save(), passkey.save()]);

    res.json({
      success: true,
      message: "Payment verified successfully",
      data: {
        payment: {
          id: payment._id,
          status: payment.status,
          amount: payment.amount,
          completedAt: payment.completedAt,
        },
        passkey: {
          passkeyId: passkey.passkeyId,
          status: passkey.status,
          expiresAt: passkey.expiresAt,
          deviceIds: passkey.deviceId || [passkey.deviceId],
        },
      },
    });
  }
);

// @desc    Get Payment History
// @route   GET /api/v2/payments/history/:studentId
// @access  Private (Student)
export const getPaymentHistory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { studentId } = req.params;
    const user = req.user as any;

    // Verify student ID matches authenticated user
    if (studentId !== user._id.toString()) {
      res.status(403);
      throw new Error("Access denied");
    }

    // Get payment history
    const payments = await PaymentModel.find({ studentId })
      .sort({ createdAt: -1 })
      .populate("courseId", "name");

    res.json({
      success: true,
      message: "Payment history retrieved successfully",
      data: {
        payments,
        count: payments.length,
        totalPaid: payments.reduce((sum, payment) => {
          return payment.status === PaymentStatus.COMPLETED
            ? sum + payment.amount
            : sum;
        }, 0),
      },
    });
  }
);

// @desc    Get Payment Details
// @route   GET /api/v2/payments/:paymentId
// @access  Private (Student)
export const getPaymentDetails = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { paymentId } = req.params;
    const user = req.user as any;

    // Get payment
    const payment = await PaymentModel.findById(paymentId).populate(
      "courseId",
      "name description"
    );

    if (!payment) {
      res.status(404);
      throw new Error("Payment not found");
    }

    // Verify student owns payment
    // if (payment.studentId.toString() !== user._id.toString()) {
    //   res.status(403);
    //   throw new Error("Access denied");
    // }

    res.json({
      success: true,
      message: "Payment details retrieved successfully",
      data: payment,
    });
  }
);

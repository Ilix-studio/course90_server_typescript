import { Request, Response } from "express";
import Razorpay from "razorpay";
import { PaymentModel } from "../../models/payment/paymentModel";
import { PasskeyModel } from "../../models/passkeys/passkeyModel";
import asyncHandler from "express-async-handler";
import { Types } from "mongoose";
import { calculateExpirationDate } from "@/utils/calculateExpiration";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

// Create order for passkey activation
export const createPaymentOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const { passkeyId, timePeriod, studentId } = req.body;

    if (!passkeyId || !timePeriod || !studentId) {
      res.status(400);
      throw new Error("Passkey ID, time period, and student ID are required");
    }

    // Find the passkey
    const passkey = await PasskeyModel.findOne({
      _id: passkeyId,
      status: "INACTIVE",
    });

    if (!passkey) {
      res.status(404);
      throw new Error("Passkey not found or already activated");
    }

    // Determine amount based on time period
    const amount = getAmountFromTimePeriod(timePeriod);

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: `passkey_${passkeyId}`,
    });

    // Create payment record
    const payment = await PaymentModel.create({
      razorpayOrderId: order.id,
      student: new Types.ObjectId(studentId),
      institute: passkey.institute,
      course: passkey.course,
      passkey: new Types.ObjectId(passkeyId),
      timePeriod,
      amount,
      payStatus: "PROCESSING",
    });

    res.status(201).json({
      success: true,
      order,
      payment: payment._id,
    });
  }
);

// Handle payment verification and passkey activation
export const verifyPaymentAndActivatePasskey = asyncHandler(
  async (req: Request, res: Response) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId } =
      req.body;

    // Verify payment signature
    const generatedSignature = crypto;
    // .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
    // .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    // .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      res.status(400);
      throw new Error("Invalid payment signature");
    }

    // Find and update payment record
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) {
      res.status(404);
      throw new Error("Payment not found");
    }

    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.payStatus = "SUCCESS";
    await payment.save();

    // Find and activate passkey
    const passkey = await PasskeyModel.findById(payment.passkey);
    if (!passkey) {
      res.status(404);
      throw new Error("Passkey not found");
    }

    // Calculate expiration date
    const expiresAt = calculateExpirationDate(payment.timePeriod);

    // Activate passkey
    passkey.status = "ACTIVE";
    passkey.activatedAt = new Date();
    passkey.expiresAt = expiresAt;
    passkey.timePeriod = payment.timePeriod;

    // Casting to Types.ObjectId to resolve the type error
    // passkey.payment = payment._id as unknown as Types.ObjectId;
    // passkey.student = payment.student as unknown as Types.ObjectId;

    await passkey.save();

    res.status(200).json({
      success: true,
      payment,
      passkey: {
        id: passkey._id,
        status: passkey.status,
        expiresAt: passkey.expiresAt,
        timePeriod: passkey.timePeriod,
      },
    });
  }
);

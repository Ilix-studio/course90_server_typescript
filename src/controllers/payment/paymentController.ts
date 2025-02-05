import { NewPaymentModel } from "../../models/payment/paymentModel";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_SECRET!,
});

const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, passkeyCount, timePeriod, amount } = req.body;
  const institute = req.body.institute;

  const options = {
    amount: amount * 100, // Razorpay expects amount in paise
    currency: "INR",
    receipt: `rcpt_${Date.now()}`,
  };

  const order = await razorpay.orders.create(options);

  const payment = await NewPaymentModel.create({
    razorpayOrderId: order.id,
    institute: institute._id,
    course: courseId,
    timePeriod,
    passkeyCount,
    amount,
    payStatus: "PROCESSING",
  });

  res.json({
    orderId: order.id,
    paymentId: payment._id,
    amount: options.amount,
    currency: options.currency,
  });
});

const handlePaymentSuccess = asyncHandler(
  async (req: Request, res: Response) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const payment = await NewPaymentModel.findOne({ razorpayOrderId });
    if (!payment) {
      res.status(404);
      throw new Error("Payment not found");
    }

    const sign = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET!)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (sign !== razorpaySignature) {
      payment.payStatus = "FAILED";
      await payment.save();
      res.status(400);
      throw new Error("Invalid signature");
    }

    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.payStatus = "SUCCESS";
    await payment.save();

    res.json({
      success: true,
      payment: {
        id: payment._id,
        status: payment.payStatus,
        amount: payment.amount,
      },
    });
  }
);

const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { paymentId } = req.params;

  const payment = await NewPaymentModel.findById(paymentId);
  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }

  res.json({
    status: payment.payStatus,
    amount: payment.amount,
    orderId: payment.razorpayOrderId,
    paymentId: payment.razorpayPaymentId,
  });
});

export { initiatePayment, handlePaymentSuccess, getPaymentStatus };

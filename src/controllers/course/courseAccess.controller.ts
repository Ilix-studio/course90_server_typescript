import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { PasskeyModel } from "../../models/passkeys/passkeyModel";
import { PaymentModel } from "../../models/payment/paymentModel";
import { CoursePricing } from "../../models/pricing/coursePricingModel";
import { StudentEnrollment } from "../../models/pricing/studentEnrollmentModel";
import {
  CheckCourseAccessRequest,
  EnrollStudentRequest,
} from "../../types/courseAccess.types";

// @desc    Check if student has course access via passkey + payment
// @route   POST /api/v2/course-access/verify
// @access  Private (Student)
export const checkCourseAccess = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { passkeyId, courseId, deviceId }: CheckCourseAccessRequest =
      req.body;

    // 1. Verify passkey exists and is active
    const passkey = await PasskeyModel.findOne({
      passkeyId,
      courseId,
      status: "ACTIVE",
      expiresAt: { $gt: new Date() },
    });

    if (!passkey) {
      res.status(403);
      throw new Error("Invalid or expired passkey");
    }

    // 2. Check if passkey is linked to a valid payment
    const payment = await PaymentModel.findOne({
      passkeyId,
      status: "COMPLETED",
      deviceId,
    });

    if (!payment) {
      res.status(403);
      throw new Error("No valid payment found for this passkey");
    }

    // 3. Check enrollment status
    const enrollment = await StudentEnrollment.findOne({
      passkeyId,
      courseId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!enrollment) {
      res.status(403);
      throw new Error("No active enrollment found");
    }

    // 4. Update access count
    passkey.accessCount = (passkey.accessCount || 0) + 1;
    await passkey.save();

    res.json({
      success: true,
      message: "Course access verified",
      data: {
        hasAccess: true,
        passkey: passkey.passkeyId,
        expiresAt: enrollment.expiresAt,
        paymentStatus: payment.status,
        deviceId: deviceId,
      },
    });
  }
);

// @desc    Enroll student after payment verification
// @route   POST /api/v2/course-access/enroll
// @access  Public
export const enrollStudent = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      courseId,
      passkeyId,
      paymentId,
      razorpayOrderId,
      razorpayPaymentId,
      deviceId,
    }: EnrollStudentRequest = req.body;

    // 1. Verify payment exists and is completed
    const payment = await PaymentModel.findOne({
      _id: paymentId,
      razorpayOrderId,
      status: "COMPLETED",
    });

    if (!payment) {
      res.status(400);
      throw new Error("Payment not found or not completed");
    }

    // 2. Get course pricing
    const pricing = await CoursePricing.findOne({
      courseId,
      isActive: true,
    });

    if (!pricing) {
      res.status(404);
      throw new Error("Course pricing not found");
    }

    // 3. Update or create passkey with payment link
    let passkey = await PasskeyModel.findOne({ passkeyId });

    if (!passkey) {
      res.status(404);
      throw new Error("Passkey not found");
    }

    // Link payment to passkey
    passkey.paymentId = payment.id;

    passkey.activatedAt = new Date();

    // Set expiry based on pricing model
    if (pricing.pricingModel === "SUBSCRIPTION") {
      const expiryDate = new Date();
      expiryDate.setMonth(
        expiryDate.getMonth() + (pricing.subscriptionDuration || 1)
      );
      passkey.expiresAt = expiryDate;
    }

    await passkey.save();

    // 4. Create enrollment record
    const enrollment = await StudentEnrollment.create({
      passkeyId,
      courseId,
      instituteId: pricing.instituteId,
      amountPaid: payment.amount,
      currency: pricing.currency,
      paymentMethod: "razorpay",
      paymentId: payment._id,
      enrolledAt: new Date(),
      expiresAt: passkey.expiresAt,
      isActive: true,
      razorpayOrderId,
      razorpayPaymentId,
    });

    res.status(201).json({
      success: true,
      message: "Student enrolled successfully",
      data: {
        enrollment,
        passkey: {
          passkeyId: passkey.passkeyId,
          status: passkey.status,
          expiresAt: passkey.expiresAt,
          deviceId: deviceId,
          deviceIds: passkey.deviceId,
        },
      },
    });
  }
);

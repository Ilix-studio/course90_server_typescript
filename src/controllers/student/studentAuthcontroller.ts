// controllers/auth/studentAuthController.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { PasskeyModel } from "../../models/passkeys/passkeyModel";
import { StudentModel } from "../../models/auth/studentModel";
import { PASSKEY_PRICING, PasskeyStatus } from "../../constants/enums";
import { isValidPasskeyFormat } from "../../utils/nanoidGenerator";

import { ValidatePasskeyBody } from "../../types/studentAuth.types";

// @desc    Validate a passkey
// @route   POST /api/v2/students/validate
// @access  Public
export const validatePasskey = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { passkey, deviceId }: ValidatePasskeyBody = req.body;

    // Validate passkey format
    if (!passkey || !isValidPasskeyFormat(passkey)) {
      res.status(400);
      throw new Error("Invalid passkey format");
    }

    // Validate device ID
    if (!deviceId) {
      res.status(400);
      throw new Error("Device ID is required");
    }

    // Find passkey in database
    const passkeyDoc = await PasskeyModel.findOne({ passkeyId: passkey })
      .populate({
        path: "instituteId",
        select: "instituteName email",
      })
      .populate({
        path: "courseId",
        select: "name description",
      });

    // If passkey not found
    if (!passkeyDoc) {
      res.status(404);
      throw new Error("Passkey not found");
    }

    // If passkey is already used
    if (passkeyDoc.status !== PasskeyStatus.PENDING) {
      if (
        passkeyDoc.status === PasskeyStatus.ACTIVE &&
        passkeyDoc.deviceId === deviceId
      ) {
        res.json({
          message: "This passkey is already active on this device",
          isActive: true,
          passkey: passkeyDoc.passkeyId,
          expiresAt: passkeyDoc.expiresAt,
        });
        return;
      } else if (passkeyDoc.status === PasskeyStatus.ACTIVE) {
        res.status(400);
        throw new Error("This passkey is already active on another device");
      } else if (passkeyDoc.status === PasskeyStatus.EXPIRED) {
        res.status(400);
        throw new Error("This passkey has expired");
      } else {
        res.status(400);
        throw new Error(
          `Passkey is in ${passkeyDoc.status} state and cannot be used`
        );
      }
    }

    // Return validation success with proper property access
    res.json({
      message: "Passkey validated successfully",
      pricingOptions: PASSKEY_PRICING,
      course: {
        id: passkeyDoc.courseId,
        name: (passkeyDoc.courseId as any).name,
      },
      institute: {
        id: passkeyDoc.instituteId,
        name: (passkeyDoc.instituteId as any).instituteName,
      },
      passkey: passkeyDoc.passkeyId,
    });
  }
);

// @desc    Renew a passkey
// @route   POST /api/v2/students/renew
// @access  Public
export const renewPasskey = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { passkeyId, durationMonths } = req.body;

    // Validate request
    if (!passkeyId) {
      res.status(400);
      throw new Error("Passkey ID is required");
    }

    if (durationMonths !== 1 && durationMonths !== 12) {
      res.status(400);
      throw new Error("Duration must be either 1 or 12 months");
    }

    // Find passkey
    const passkey = await PasskeyModel.findOne({ passkeyId })
      .populate("courseId", "name description")
      .populate("instituteId", "instituteName");

    if (!passkey) {
      res.status(404);
      throw new Error("Passkey not found");
    }

    // Calculate renewal price
    const renewalPrice = PASSKEY_PRICING[durationMonths === 1 ? 1 : 12];

    // Return information for renewal payment with proper property access
    res.json({
      success: true,
      passkeyId: passkey.passkeyId,
      courseId: passkey.courseId,
      courseName: (passkey.courseId as any).name,
      instituteName: (passkey.instituteId as any).instituteName,
      durationMonths,
      renewalPrice,
      currentStatus: passkey.status,
      expiresAt: passkey.expiresAt,
      renewalEligible: true,
    });
  }
);

// @desc    Login student with passkey
// @route   POST /api/v2/students/login
// @access  Public
export const loginStudent = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { passkeyId, deviceId } = req.body;

    // Validate input
    if (!passkeyId || !deviceId) {
      res.status(400);
      throw new Error("Passkey ID and Device ID are required");
    }

    // Find student with this passkey and device using static method
    const student = await StudentModel.findByPasskeyAndDevice(
      passkeyId,
      deviceId
    );

    if (!student) {
      res.status(404);
      throw new Error("Student not found with this passkey and device");
    }

    // Get active passkey
    const activePasskey = student.getActivePasscode();

    if (!activePasskey) {
      res.status(400);
      throw new Error("No active passkey found for this student");
    }

    // Check if passkey is expired
    if (activePasskey.expiresAt && activePasskey.expiresAt <= new Date()) {
      res.status(400);
      throw new Error("Passkey has expired");
    }

    // Generate JWT token (you'll need to implement this)
    // const token = generateJWTToken(student._id);

    res.json({
      success: true,
      message: "Student login successful",
      data: {
        studentId: student._id,
        name: student.name,
        email: student.email,
        activePasskey: {
          passkeyId: activePasskey.passkeyId,
          course: activePasskey.course,
          institute: activePasskey.institute,
          expiresAt: activePasskey.expiresAt,
        },
        // token,
      },
    });
  }
);

// @desc    Switch student account
// @route   POST /api/v2/students/switch-account
// @access  Private (Student)
export const switchAccount = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { newPasskey } = req.body;
    const currentStudent = req.student; // From auth middleware

    if (!newPasskey) {
      res.status(400);
      throw new Error("New passkey is required");
    }

    if (!currentStudent) {
      res.status(401);
      throw new Error("Authentication required");
    }

    // Validate new passkey format
    if (!isValidPasskeyFormat(newPasskey)) {
      res.status(400);
      throw new Error("Invalid passkey format");
    }

    // Check if student already has this passkey
    const hasPasskey = currentStudent.nanoId.some(
      (p) => p.passkeyId === newPasskey && p.isActive
    );

    if (hasPasskey) {
      res.status(400);
      throw new Error("You already have access to this passkey");
    }

    // Find the new passkey in PasskeyModel
    const passkeyDoc = await PasskeyModel.findOne({ passkeyId: newPasskey })
      .populate("courseId", "name description")
      .populate("instituteId", "instituteName");

    if (!passkeyDoc) {
      res.status(404);
      throw new Error("Passkey not found");
    }

    if (passkeyDoc.status !== PasskeyStatus.ACTIVE) {
      res.status(400);
      throw new Error("Passkey is not active");
    }

    // Add new passkey to student's nanoId array
    // currentStudent.nanoId.push({
    //   passkeyId: newPasskey,
    //   institute: passkeyDoc.instituteId._id,
    //   course: passkeyDoc.courseId._id,
    //   isActive: true,
    //   activatedAt: new Date(),
    //   expiresAt: passkeyDoc.expiresAt,
    // });

    await currentStudent.save();

    res.json({
      success: true,
      message: "Account switched successfully",
      data: {
        newPasskey: {
          passkeyId: newPasskey,
          course: passkeyDoc.courseId,
          institute: passkeyDoc.instituteId,
          expiresAt: passkeyDoc.expiresAt,
        },
      },
    });
  }
);

// @desc    Get student performance
// @route   GET /api/v2/students/performance/:courseId
// @access  Private (Student)
export const getPerformance = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const currentStudent = req.student; // From auth middleware

    if (!currentStudent) {
      res.status(401);
      throw new Error("Authentication required");
    }

    // Check if student has access to this course
    if (!currentStudent.hasCourseAccess(courseId)) {
      res.status(403);
      throw new Error("You don't have access to this course");
    }

    // TODO: Implement performance calculation logic
    // This would involve querying student's submissions, scores, etc.

    res.json({
      success: true,
      message: "Performance data retrieved successfully",
      data: {
        courseId,
        studentId: currentStudent._id,
        // Add performance metrics here
        generalMCQsAttempted: 0,
        mockMCQsAttempted: 0,
        averageScore: 0,
        totalTimeSpent: 0,
        lastActivity: new Date(),
      },
    });
  }
);

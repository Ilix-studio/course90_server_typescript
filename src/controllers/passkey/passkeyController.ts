import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { AuthenticatedRequest } from "../../types/request.types";
import {
  GeneratePasskeysRequest,
  ValidatePasskeyRequest,
} from "../../types/passkey.types";
import { CourseModel } from "../../models/course/courseModel";
import { generateMultiplePasskeyIds } from "../../utils/nanoidGenerator";
import { PasskeyStatus } from "../../constants/enums";
import { PasskeyModel } from "../../models/passkeys/passkeyModel";

/**
 * Generate passkeys for a course
 * @route POST /api/passkeys/generate-passkeys
 * @access Private (Institute only)
 */
export const generatePasskeys = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Ensure institute is defined in the request
    if (!req.institute) {
      res.status(401);
      throw new Error("Not authorized, institute information missing");
    }

    const { courseId, count }: GeneratePasskeysRequest = req.body;

    // Validate input
    if (!courseId || !count || count <= 0 || count > 100) {
      res.status(400);
      throw new Error("Invalid request. Count must be between 1 and 100.");
    }

    // Check if course exists and belongs to the institute
    const course = await CourseModel.findOne({
      _id: courseId,
      institute: req.institute._id,
    });

    if (!course) {
      res.status(404);
      throw new Error("Course not found or doesn't belong to your institute.");
    }

    // Generate unique passkeys
    const passkeyIds = generateMultiplePasskeyIds(count);

    // Create passkey documents
    const passkeys = passkeyIds.map((passkeyId) => ({
      passkeyId,
      instituteId: req.institute,
      courseId: course._id,
      status: PasskeyStatus.PENDING,
      durationMonths: 1, // Default to 1 month, will be updated when activated
    }));

    // Save to database
    await PasskeyModel.insertMany(passkeys);

    res.status(201).json({
      success: true,
      count,
      passkeys: passkeyIds,
      courseId,
      courseName: course.name,
    });
  }
);

// Get all passkeys for an institute
export const getInstitutePasskeys = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { status, courseId } = req.query;

    const query: any = { instituteId: req.institute };

    // Apply filters if provided
    if (
      status &&
      Object.values(PasskeyStatus).includes(status as PasskeyStatus)
    ) {
      query.status = status;
    }

    if (courseId) {
      query.courseId = courseId;
    }

    // Get passkeys with pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const passkeys = await PasskeyModel.find(query)
      .populate("courseId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await PasskeyModel.countDocuments(query);

    res.json({
      success: true,
      passkeys,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  }
);
// Get passkey details
export const getPasskeyDetails = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { passkeyId } = req.params;

    const passkey = await PasskeyModel.findOne({
      passkeyId,
      instituteId: req.institute,
    }).populate("courseId", "name");

    if (!passkey) {
      res.status(404);
      throw new Error("Passkey not found.");
    }

    res.json({
      success: true,
      passkey,
    });
  }
);

// Validate a passkey
export const validatePasskey = asyncHandler(
  async (req: Request, res: Response) => {
    // add instituteName, passkeyId, extract deviceId
    const { passkeyId, deviceId }: ValidatePasskeyRequest = req.body;

    if (!passkeyId || !deviceId) {
      res.status(400);
      throw new Error("Passkey ID and device ID are required.");
    }

    const passkey = await PasskeyModel.findOne({
      passkeyId,
      status: PasskeyStatus.ACTIVE,
      expiresAt: { $gt: new Date() },
    }).populate("courseId", "name");

    if (!passkey) {
      res.status(404);
      throw new Error("Invalid or expired passkey.");
    }

    // If passkey is already bound to a device, check if it matches
    if (passkey.deviceId && passkey.deviceId !== deviceId) {
      res.status(403);
      throw new Error("Passkey is already in use on another device.");
    }

    // Calculate remaining days
    const remainingDays = passkey.getRemainingDays();

    res.json({
      success: true,
      valid: true,
      passkey: {
        passkeyId: passkey.passkeyId,
        courseId: passkey.courseId._id,
        courseName: (passkey.courseId as any).name,
        status: passkey.status,
        durationMonths: passkey.durationMonths,
        expiresAt: passkey.expiresAt,
        remainingDays,
      },
    });
  }
);

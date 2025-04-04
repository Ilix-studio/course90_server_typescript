import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { AuthenticatedRequest } from "../../types/request.types";
import { GeneratePasskeysRequest } from "../../types/passkey.types";
import { CourseModel } from "../../models/course/courseModel";
import { generateMultiplePasskeyIds } from "../../utils/nanoidGenerator";
import { PasskeyStatus } from "../../constants/enums";
import { PasskeyModel } from "../../models/passkeys/passkeyModel";

/**
 * Generate passkeys for a course
 * @route POST /api/passkeys/generate-passkeys
 * @access Private (Institute only)
 */
/**
 * Generate passkeys for a course
 * @route POST /api/passkeys/generate
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

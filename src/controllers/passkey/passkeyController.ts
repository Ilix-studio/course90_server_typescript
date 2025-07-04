import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { PasskeyModel } from "../../models/passkeys/passkeyModel";
import { CourseModel } from "../../models/course/courseModel";

import { PackageType, PasskeyStatus, UserRole } from "../../constants/enums";

import { Subject } from "../../models/course/subjectModel";
import {
  GeneratePasskeysRequest,
  ActivatePasskeyRequest,
  ReactivatePasskeyRequest,
  CalculatePriceRequest,
} from "../../types/passkey.types";
import { generatePasskeyId } from "../../utils/nanoidGenerator";
import { Teacher } from "../../models/auth/teacherModel";

// Package pricing configuration
const PACKAGE_PRICING: Record<
  PackageType,
  {
    name: string;
    description: string;
    pricePerMonth: number;
    paidBy: string;
  }
> = {
  [PackageType.NO_HEADACHE]: {
    name: "No Headache Package",
    description: "Students pay platform fee directly",
    pricePerMonth: 90,
    paidBy: "STUDENT",
  },
  [PackageType.PAY_AND_GENERATE]: {
    name: "Pay and Generate Package",
    description: "Institute pays first month, then students",
    pricePerMonth: 90,
    paidBy: "INSTITUTE_FIRST_MONTH",
  },
};

// @desc    Generate Passkeys for a Course
// @route   POST /api/v2/passkeys/generate
// @access  Private (Principal)
export const generatePasskeys = asyncHandler(
  async (req: Request, res: Response) => {
    const principal = req.user as any;
    const {
      courseId,
      packageType,
      quantity,
      durationMonths,
    }: GeneratePasskeysRequest = req.body;

    // Validations
    if (!courseId || !packageType || !quantity || !durationMonths) {
      res.status(400);
      throw new Error(
        "Course ID, package type, quantity, and duration are required"
      );
    }

    if (quantity < 1 || quantity > 100) {
      res.status(400);
      throw new Error("Quantity must be between 1 and 100");
    }

    if (durationMonths < 1 || durationMonths > 12) {
      res.status(400);
      throw new Error("Duration must be between 1 and 12 months");
    }

    if (!Object.values(PackageType).includes(packageType)) {
      res.status(400);
      throw new Error("Invalid package type");
    }

    // Verify course ownership
    const course = await CourseModel.findOne({
      _id: courseId,
      instituteId: principal._id,
      isActive: true,
    });

    if (!course) {
      res.status(404);
      throw new Error("Course not found or access denied");
    }

    // Get package info
    const packageInfo = PACKAGE_PRICING[packageType];
    const totalPrice = packageInfo.pricePerMonth * durationMonths * quantity;

    // Generate passkeys
    const passkeys = [];
    const passkeyIds = new Set<string>();

    for (let i = 0; i < quantity; i++) {
      let passkeyId: string;

      // Ensure unique passkey ID
      do {
        passkeyId = generatePasskeyId();
      } while (
        passkeyIds.has(passkeyId) ||
        (await PasskeyModel.findOne({ passkeyId }))
      );

      passkeyIds.add(passkeyId);

      // Calculate next platform fee due date
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const passkey = await PasskeyModel.create({
        passkeyId,
        instituteId: principal._id,
        courseId,
        packageType,
        durationMonths,
        status: PasskeyStatus.GENERATED,
        generatedAt: new Date(),
        generatedBy: principal._id,
        nextPlatformFeeDue: nextMonth,
        accessCount: 0,
        deviceIds: [], // Initialize empty array for multiple device support
      });

      // Add pricing details for response
      const passkeyWithPricing = {
        ...passkey.toObject(),
        pricing: {
          packageName: packageInfo.name,
          pricePerMonth: packageInfo.pricePerMonth,
          totalDuration: durationMonths,
          totalAmount: packageInfo.pricePerMonth * durationMonths,
        },
      };

      passkeys.push(passkeyWithPricing);
    }

    res.status(201).json({
      success: true,
      message: `${quantity} passkeys generated successfully`,
      data: {
        passkeys,
        pricing: {
          totalPrice,
          pricePerPasskey: packageInfo.pricePerMonth * durationMonths,
          currency: "INR",
        },
      },
    });
  }
);

// @desc    Activate Passkey
// @route   POST /api/v2/passkeys/activate
// @access  Private (Principal)
export const activatePasskey = asyncHandler(
  async (req: Request, res: Response) => {
    const principal = req.user as any;
    const { passkeyId, courseId, deviceId }: ActivatePasskeyRequest = req.body;

    // Find passkey
    const passkey = await PasskeyModel.findOne({
      passkeyId,
      instituteId: principal._id,
      courseId,
    });

    if (!passkey) {
      res.status(404);
      throw new Error("Passkey not found");
    }

    // Verify passkey status
    if (passkey.status !== PasskeyStatus.GENERATED) {
      res.status(400);
      throw new Error(`Passkey already activated (status: ${passkey.status})`);
    }

    // Update passkey with student and device info

    passkey.deviceId = deviceId;

    passkey.activatedAt = new Date();

    // Set expiry date
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + passkey.durationMonths);
    passkey.expiresAt = expiryDate;

    // Update status based on package type
    if (passkey.packageType === PackageType.PAY_AND_GENERATE) {
      // Institute paid first month, so platform fee is paid
      passkey.status = PasskeyStatus.PLATFORM_FEE_PAID;
    } else {
      // Student needs to pay platform fee
      passkey.status = PasskeyStatus.PLATFORM_FEE_PENDING;
    }

    await passkey.save();

    res.json({
      success: true,
      message: "Passkey activated successfully",
      data: {
        passkeyId: passkey.passkeyId,
        status: passkey.status,
        activatedAt: passkey.activatedAt,
        expiresAt: passkey.expiresAt,
        // studentId: passkey.studentId,
        deviceId: passkey.deviceId,
      },
    });
  }
);

// @desc    Reactivate Passkey
// @route   POST /api/v2/passkeys/reactivate
// @access  Private (Principal)
export const reactivatePasskey = asyncHandler(
  async (req: Request, res: Response) => {
    const principal = req.user as any;
    const { passkeyId, reason }: ReactivatePasskeyRequest = req.body;

    // Find passkey
    const passkey = await PasskeyModel.findOne({
      passkeyId,
      instituteId: principal._id,
    });

    if (!passkey) {
      res.status(404);
      throw new Error("Passkey not found");
    }

    // Verify passkey is not already active
    if (
      passkey.status === PasskeyStatus.FULLY_ACTIVE ||
      passkey.status === PasskeyStatus.PLATFORM_FEE_PAID
    ) {
      res.status(400);
      throw new Error("Passkey is already active");
    }

    // Set new expiry date
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + passkey.durationMonths);
    passkey.expiresAt = expiryDate;

    // Update status based on package type
    const newStatus =
      passkey.packageType === PackageType.PAY_AND_GENERATE
        ? PasskeyStatus.FULLY_ACTIVE
        : PasskeyStatus.PLATFORM_FEE_PAID;
    passkey.status = newStatus;

    // Add to status history
    passkey.statusHistory.push({
      status: newStatus,
      changedAt: new Date(),
      changedBy: principal._id,
      reason: reason || "Reactivated by institute",
    });

    await passkey.save();

    res.json({
      success: true,
      message: "Passkey reactivated successfully",
      data: {
        passkeyId: passkey.passkeyId,
        status: passkey.status,
        reactivatedAt: new Date(),
        expiresAt: passkey.expiresAt,
        reason: reason || "Reactivated by institute",
      },
    });
  }
);

// @desc    Get Package Types and Pricing
// @route   GET /api/v2/passkeys/packages
// @access  Private (Principal)
export const getPackageInfo = asyncHandler(
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Package information retrieved successfully",
      data: {
        packages: Object.entries(PACKAGE_PRICING).map(([type, info]) => ({
          type,
          ...info,
        })),
        currency: "INR",
        notes: [
          "Prices are per month per passkey",
          "Minimum duration: 1 month",
          "Maximum duration: 12 months",
          "PAY_AND_GENERATE: First month covered by institute",
          "NO_HEADACHE: All payments by students",
        ],
      },
    });
  }
);

// @desc    Calculate Passkey Pricing
// @route   POST /api/v2/passkeys/calculate-price
// @access  Private (Principal)
export const calculatePrice = asyncHandler(
  async (req: Request, res: Response) => {
    const { packageType, durationMonths, quantity }: CalculatePriceRequest =
      req.body;

    if (!packageType || !durationMonths || !quantity) {
      res.status(400);
      throw new Error("Package type, duration, and quantity are required");
    }

    if (!Object.values(PackageType).includes(packageType)) {
      res.status(400);
      throw new Error("Invalid package type");
    }

    if (durationMonths < 1 || durationMonths > 12) {
      res.status(400);
      throw new Error("Duration must be between 1 and 12 months");
    }

    if (quantity < 1 || quantity > 100) {
      res.status(400);
      throw new Error("Quantity must be between 1 and 100");
    }

    const packageInfo = PACKAGE_PRICING[packageType];
    const pricePerPasskey = packageInfo.pricePerMonth * durationMonths;
    const totalPrice = pricePerPasskey * quantity;

    // Apply bulk discounts
    let discount = 0;
    if (quantity >= 50) {
      discount = 0.15; // 15% discount for 50+ passkeys
    } else if (quantity >= 25) {
      discount = 0.1; // 10% discount for 25+ passkeys
    } else if (quantity >= 10) {
      discount = 0.05; // 5% discount for 10+ passkeys
    }

    const discountAmount = totalPrice * discount;
    const finalPrice = totalPrice - discountAmount;

    // Calculate institute vs student payment breakdown
    let institutePayment = 0;
    let studentPayment = finalPrice;

    if (packageType === PackageType.PAY_AND_GENERATE) {
      // Institute covers first month for all passkeys
      const firstMonthCost = packageInfo.pricePerMonth * quantity;
      institutePayment = Math.min(firstMonthCost, finalPrice);
      studentPayment = finalPrice - institutePayment;
    }

    res.json({
      success: true,
      message: "Price calculated successfully",
      data: {
        packageInfo,
        calculation: {
          quantity,
          durationMonths,
          pricePerMonth: packageInfo.pricePerMonth,
          pricePerPasskey,
          subtotal: totalPrice,
          discount: {
            percentage: discount * 100,
            amount: discountAmount,
          },
          finalPrice,
          paymentBreakdown: {
            institutePayment,
            studentPayment,
            description:
              packageType === PackageType.PAY_AND_GENERATE
                ? "Institute covers first month, students pay remaining"
                : "Students pay all fees",
          },
          currency: "INR",
        },
      },
    });
  }
);

// @desc    List Institute Passkeys
// @route   GET /api/v2/passkeys
// @access  Private (Principal, Teacher)
export const listPasskeys = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user as any;
    const userRole = req.userRole;
    const { page = "1", limit = "10", status, courseId } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let query: any = {};

    // Filter by institute for principals
    if (userRole === UserRole.PRINCIPAL) {
      query.instituteId = user._id;
    }

    // Filter by course for teachers
    if (userRole === UserRole.TEACHER) {
      const teacher = await Teacher.findById(user._id).populate(
        "assignedSubjects"
      );
      const subjectIds = teacher?.assignedSubjects || [];
      const subjects = await Subject.find({ _id: { $in: subjectIds } });
      const courseIds = [...new Set(subjects.map((s) => s.courseId))];
      query.courseId = { $in: courseIds };
    }

    // Apply status filter if provided
    if (status) {
      query.status = status;
    }

    // Apply courseId filter if provided
    if (courseId) {
      query.courseId = courseId;
    }

    // Count total documents for pagination
    const total = await PasskeyModel.countDocuments(query);

    // Get passkeys with pagination
    const passkeys = await PasskeyModel.find(query)
      .sort({ generatedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("courseId", "name description")
      .populate("studentId", "name email");

    // Add package pricing info to each passkey
    const passkeysWithPricing = passkeys.map((passkey) => {
      const packageInfo = PACKAGE_PRICING[passkey.packageType as PackageType];
      return {
        ...passkey.toObject(),
        calculatedPricing: {
          packageName: packageInfo.name,
          pricePerMonth: packageInfo.pricePerMonth,
          totalDuration: passkey.durationMonths,
          totalAmount: packageInfo.pricePerMonth * passkey.durationMonths,
        },
      };
    });

    res.json({
      success: true,
      message: "Passkeys retrieved successfully",
      data: {
        passkeys: passkeysWithPricing,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  }
);

// @desc    Get Passkey Details
// @route   GET /api/v2/passkeys/:passkeyId
// @access  Private (Principal, Teacher)
export const getPasskeyDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const { passkeyId } = req.params;
    const user = req.user as any;
    const userRole = req.userRole;

    let passkey;

    if (userRole === UserRole.PRINCIPAL) {
      passkey = await PasskeyModel.findOne({
        passkeyId,
        instituteId: user._id,
      })
        .populate("courseId", "name description")
        .populate("studentId", "name email deviceId")
        .populate("paymentId");
    } else if (userRole === UserRole.TEACHER) {
      // Verify teacher has access to this passkey's course
      const teacher = await Teacher.findById(user._id).populate(
        "assignedSubjects"
      );
      const subjectIds = teacher?.assignedSubjects || [];
      const subjects = await Subject.find({ _id: { $in: subjectIds } });
      const courseIds = [...new Set(subjects.map((s) => s.courseId))];

      passkey = await PasskeyModel.findOne({
        passkeyId,
        courseId: { $in: courseIds },
      })
        .populate("courseId", "name description")
        .populate("studentId", "name email");
    }

    if (!passkey) {
      res.status(404);
      throw new Error("Passkey not found or access denied");
    }

    // Add calculated pricing to response
    const packageInfo = PACKAGE_PRICING[passkey.packageType as PackageType];
    const passkeyWithPricing = {
      ...passkey.toObject(),
      calculatedPricing: {
        packageName: packageInfo.name,
        pricePerMonth: packageInfo.pricePerMonth,
        totalDuration: passkey.durationMonths,
        totalAmount: packageInfo.pricePerMonth * passkey.durationMonths,
      },
    };

    res.json({
      success: true,
      message: "Passkey details retrieved successfully",
      data: passkeyWithPricing,
    });
  }
);

// @desc    Revoke Passkey
// @route   POST /api/v2/passkeys/revoke
// @access  Private (Principal)
export const revokePasskey = asyncHandler(
  async (req: Request, res: Response) => {
    const principal = req.user as any;
    const { passkeyId, reason } = req.body;

    // Find passkey
    const passkey = await PasskeyModel.findOne({
      passkeyId,
      instituteId: principal._id,
    });

    if (!passkey) {
      res.status(404);
      throw new Error("Passkey not found");
    }

    // Update status to revoked
    passkey.status = PasskeyStatus.REVOKED;

    // Add to status history
    passkey.statusHistory.push({
      status: PasskeyStatus.REVOKED,
      changedAt: new Date(),
      changedBy: principal._id,
      reason: reason || "Revoked by institute",
    });

    await passkey.save();

    res.json({
      success: true,
      message: "Passkey revoked successfully",
      data: {
        passkeyId: passkey.passkeyId,
        status: passkey.status,
        revokedAt: new Date(),
      },
    });
  }
);

// @desc    Get Passkey Analytics
// @route   GET /api/v2/passkeys/analytics
// @access  Private (Principal, Teacher)
export const getPasskeyAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user as any;
    const userRole = req.userRole;
    const { period = "month" } = req.query;

    let matchQuery: any = {};

    if (userRole === UserRole.PRINCIPAL) {
      matchQuery.instituteId = user._id;
    } else if (userRole === UserRole.TEACHER) {
      const teacher = await Teacher.findById(user._id).populate(
        "assignedSubjects"
      );
      const subjectIds = teacher?.assignedSubjects || [];
      const subjects = await Subject.find({ _id: { $in: subjectIds } });
      const courseIds = [...new Set(subjects.map((s) => s.courseId))];
      matchQuery.courseId = { $in: courseIds };
    }

    // Get all passkeys matching the query
    const passkeys = await PasskeyModel.find(matchQuery);

    // Calculate analytics
    const totalCount = passkeys.length;
    const statusCounts: Record<string, number> = {};
    const packageCounts: Record<string, number> = {};
    const courseDistribution: Record<string, number> = {};

    passkeys.forEach((passkey) => {
      // Count by status
      const status = passkey.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Count by package type
      const packageType = passkey.packageType;
      packageCounts[packageType] = (packageCounts[packageType] || 0) + 1;

      // Count by course
      const courseId = passkey.courseId.toString();
      courseDistribution[courseId] = (courseDistribution[courseId] || 0) + 1;
    });

    res.json({
      success: true,
      message: "Passkey analytics retrieved successfully",
      data: {
        overview: {
          totalPasskeys: totalCount,
          activePasskeys: statusCounts[PasskeyStatus.ACTIVE] || 0,
          pendingPasskeys: statusCounts[PasskeyStatus.PENDING] || 0,
          expiredPasskeys: statusCounts[PasskeyStatus.EXPIRED] || 0,
        },
        statusDistribution: statusCounts,
        packageDistribution: packageCounts,
        courseDistribution,
      },
    });
  }
);

// Export function for routing compatibility
export const getInstitutePasskeys = listPasskeys;

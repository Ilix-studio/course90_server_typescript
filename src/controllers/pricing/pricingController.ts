import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StudentEnrollment } from "../../models/pricing/studentEnrollmentModel";
import { CoursePricing } from "../../models/pricing/coursePricingModel";
import { CourseModel } from "../../models/course/courseModel";
import { UserRole, PricingModel, CurrencyCode } from "../../constants/enums";
import {
  CreateCoursePricingRequest,
  UpdateCoursePricingRequest,
  CalculatePricingRequest,
} from "../../types/pricing.types";

// @desc    Create Course Pricing
// @route   POST /api/v2/pricing/course
// @access  Private (Principal only)
export const createCoursePricing = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      courseId,
      pricingModel,
      currency = CurrencyCode.INR,
      basePrice,
      subscriptionDuration,
      taxRate,
      taxIncluded = false,
    }: CreateCoursePricingRequest = req.body;

    const user = req.user as any;
    const userRole = req.userRole;

    // Verify course ownership
    const course = await CourseModel.findOne({
      _id: courseId,
      instituteId: user._id,
      isActive: true,
    });

    if (!course) {
      res.status(404);
      throw new Error("Course not found or access denied");
    }

    // Check if pricing already exists
    const existingPricing = await CoursePricing.findOne({ courseId });
    if (existingPricing) {
      res.status(400);
      throw new Error(
        "Pricing already exists for this course. Use update endpoint."
      );
    }

    // Validate pricing model requirements
    if (pricingModel !== PricingModel.FREE && (!basePrice || basePrice < 0)) {
      res.status(400);
      throw new Error("Base price is required for paid models");
    }

    if (pricingModel === PricingModel.SUBSCRIPTION && !subscriptionDuration) {
      res.status(400);
      throw new Error(
        "Subscription duration is required for subscription model"
      );
    }

    // Create pricing
    const pricing = await CoursePricing.create({
      courseId,
      instituteId: user._id,
      pricingModel,
      currency,
      basePrice: basePrice || 0,
      subscriptionDuration,
      taxRate: taxRate || 0,
      taxIncluded,
      createdBy: user._id,
      createdByModel:
        userRole === UserRole.PRINCIPAL ? "Institute" : "SuperAdmin",
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Course pricing created successfully",
      data: pricing,
    });
  }
);

// @desc    Get Course Pricing
// @route   GET /api/v2/pricing/course/:courseId
// @access  Public
export const getCoursePricing = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;

    const pricing = await CoursePricing.findOne({
      courseId,
      isActive: true,
    });

    if (!pricing) {
      res.status(404);
      throw new Error("Course pricing not found");
    }

    // Get course details
    const course = await CourseModel.findById(courseId, "name description");

    res.json({
      success: true,
      message: "Course pricing retrieved successfully",
      data: {
        pricing,
        course,
      },
    });
  }
);

// @desc    Update Course Pricing
// @route   PUT /api/v2/pricing/course/:courseId
// @access  Private (Principal only)
export const updateCoursePricing = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const {
      pricingModel,
      currency,
      basePrice,
      subscriptionDuration,
      taxRate,
      taxIncluded,
    }: UpdateCoursePricingRequest = req.body;

    const user = req.user as any;

    // Verify course ownership
    const course = await CourseModel.findOne({
      _id: courseId,
      instituteId: user._id,
      isActive: true,
    });

    if (!course) {
      res.status(404);
      throw new Error("Course not found or access denied");
    }

    // Get existing pricing
    const pricing = await CoursePricing.findOne({ courseId, isActive: true });
    if (!pricing) {
      res.status(404);
      throw new Error("Course pricing not found");
    }

    // Update pricing
    if (pricingModel !== undefined) pricing.pricingModel = pricingModel;
    if (currency !== undefined) pricing.currency = currency;
    if (basePrice !== undefined) pricing.basePrice = basePrice;
    if (subscriptionDuration !== undefined)
      pricing.subscriptionDuration = subscriptionDuration;
    if (taxRate !== undefined) pricing.taxRate = taxRate;
    if (taxIncluded !== undefined) pricing.taxIncluded = taxIncluded;

    pricing.updatedAt = new Date();

    await pricing.save();

    res.json({
      success: true,
      message: "Course pricing updated successfully",
      data: pricing,
    });
  }
);

// @desc    Calculate Course Pricing
// @route   POST /api/v2/pricing/calculate
// @access  Public
export const calculateCoursePricing = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      courseId,
      pricingModel,
      quantity = 1,
      duration = 1,
    }: CalculatePricingRequest = req.body;

    // Get course pricing
    const pricing = await CoursePricing.findOne({
      courseId,
      isActive: true,
    });

    if (!pricing) {
      res.status(404);
      throw new Error("Course pricing not found");
    }

    // Use provided pricing model or default to stored one
    const model = pricingModel || pricing.pricingModel;

    // Calculate base price
    let totalPrice = (pricing.basePrice ?? 0) * quantity;

    // Apply subscription duration if applicable
    if (model === PricingModel.SUBSCRIPTION) {
      const months = duration || pricing.subscriptionDuration || 1;
      totalPrice *= months;
    }

    // Calculate tax if not included
    let taxAmount = 0;
    if (pricing.taxRate && !pricing.taxIncluded) {
      taxAmount = totalPrice * (pricing.taxRate / 100);
    }

    // Final price
    const finalPrice = totalPrice + taxAmount;

    res.json({
      success: true,
      message: "Price calculated successfully",
      data: {
        course: {
          id: courseId,
          pricing: {
            model,
            basePrice: pricing.basePrice,
            currency: pricing.currency,
            taxRate: pricing.taxRate,
            taxIncluded: pricing.taxIncluded,
          },
        },
        calculation: {
          quantity,
          duration,
          subtotal: totalPrice,
          tax: taxAmount,
          total: finalPrice,
          currency: pricing.currency,
        },
      },
    });
  }
);

// @desc    Get Student Enrollments
// @route   GET /api/v2/pricing/enrollments/:studentId
// @access  Private (Student)
export const getStudentEnrollments = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { studentId } = req.params;
    const user = req.user as any;

    // Verify student ID matches authenticated user
    if (studentId !== user._id.toString()) {
      res.status(403);
      throw new Error("Access denied");
    }

    // Get all active enrollments
    const enrollments = await StudentEnrollment.find({
      studentId,
      isActive: true,
    }).populate("courseId", "name description");

    res.json({
      success: true,
      message: "Student enrollments retrieved successfully",
      data: {
        enrollments,
        count: enrollments.length,
      },
    });
  }
);

// @desc    Get Course Enrollments
// @route   GET /api/v2/pricing/course/:courseId/enrollments
// @access  Private (Principal or Teacher)
export const getCourseEnrollments = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const user = req.user as any;
    const userRole = req.userRole;

    // Verify access
    if (userRole === UserRole.PRINCIPAL) {
      const course = await CourseModel.findOne({
        _id: courseId,
        instituteId: user._id,
      });

      if (!course) {
        res.status(403);
        throw new Error("Access denied");
      }
    }

    // Get all enrollments
    const enrollments = await StudentEnrollment.find({
      courseId,
    }).populate("studentId", "name email");

    res.json({
      success: true,
      message: "Course enrollments retrieved successfully",
      data: {
        enrollments,
        count: enrollments.length,
        activeCount: enrollments.filter((e) => e.isActive).length,
      },
    });
  }
);

// @desc    Request Refund
// @route   POST /api/v2/pricing/refund/:enrollmentId
// @access  Private (Student)
export const requestRefund = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { enrollmentId } = req.params;
    const { reason } = req.body;
    const user = req.user as any;

    // Get enrollment
    const enrollment = await StudentEnrollment.findById(enrollmentId);
    if (!enrollment) {
      res.status(404);
      throw new Error("Enrollment not found");
    }

    // Verify student owns enrollment
    if (enrollment.studentId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error("Access denied");
    }

    // Verify refund eligibility (example: within 7 days of enrollment)
    const enrollmentDate = new Date(enrollment.enrolledAt);
    const now = new Date();
    const daysSinceEnrollment = Math.floor(
      (now.getTime() - enrollmentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceEnrollment > 7) {
      res.status(400);
      throw new Error("Refund period has expired (7 days)");
    }

    // Create refund request (implementation would depend on payment processor)
    // Example: Flag enrollment for refund
    enrollment.isActive = false;
    enrollment.metadata = {
      ...enrollment.metadata,
      refundRequested: true,
      refundRequestDate: now,
      refundReason: reason,
    };

    await enrollment.save();

    res.json({
      success: true,
      message: "Refund request submitted successfully",
      data: {
        enrollment: enrollmentId,
        refundRequestDate: now,
      },
    });
  }
);

// @desc    Get Pricing Analytics
// @route   GET /api/v2/pricing/analytics/:instituteId
// @access  Private (Principal)
export const getPricingAnalytics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { instituteId } = req.params;
    const user = req.user as any;

    // Verify institute ID matches authenticated user
    if (instituteId !== user._id.toString()) {
      res.status(403);
      throw new Error("Access denied");
    }

    // Get all courses
    const courses = await CourseModel.find({ instituteId });
    const courseIds = courses.map((course) => course._id);

    // Get pricing for all courses
    const pricingData = await CoursePricing.find({
      courseId: { $in: courseIds },
      isActive: true,
    });

    // Get enrollments
    const enrollments = await StudentEnrollment.find({
      courseId: { $in: courseIds },
    });

    // Calculate revenue
    const totalRevenue = enrollments.reduce(
      (sum, enrollment) => sum + enrollment.amountPaid,
      0
    );

    // Count active enrollments
    const activeEnrollments = enrollments.filter((e) => e.isActive).length;

    // Group enrollments by course
    interface CourseRevenueData {
      total: number;
      count: number;
      active: number;
    }

    const courseRevenue: Record<string, CourseRevenueData> = {};
    for (const enrollment of enrollments) {
      const courseId = enrollment.courseId.toString();
      if (!courseRevenue[courseId]) {
        courseRevenue[courseId] = {
          total: 0,
          count: 0,
          active: 0,
        };
      }

      courseRevenue[courseId].total += enrollment.amountPaid;
      courseRevenue[courseId].count += 1;
      if (enrollment.isActive) {
        courseRevenue[courseId].active += 1;
      }
    }

    res.json({
      success: true,
      message: "Pricing analytics retrieved successfully",
      data: {
        overview: {
          totalRevenue,
          totalEnrollments: enrollments.length,
          activeEnrollments,
          coursesWithPricing: pricingData.length,
        },
        courseRevenue,
        recentEnrollments: enrollments
          .sort((a, b) => {
            return (
              new Date(b.enrolledAt).getTime() -
              new Date(a.enrolledAt).getTime()
            );
          })
          .slice(0, 5),
      },
    });
  }
);

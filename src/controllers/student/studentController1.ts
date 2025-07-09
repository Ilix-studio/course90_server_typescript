// controllers/students/studentController.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { PasskeyModel } from "../../models/passkeys/passkeyModel";
import { CourseModel } from "../../models/course/courseModel";

import { PasskeyStatus } from "../../constants/enums";
import { StudentModel } from "../../models/auth/studentModel";

// @desc    Renew Passkey Subscription
// @route   POST /api/v2/students/renew
// @access  Private (Student)
export const renewPasskey = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { passkeyId, durationMonths } = req.body;
    const student = req.user as any;

    // Validate input
    if (!passkeyId) {
      res.status(400);
      throw new Error("Passkey ID is required");
    }

    if (durationMonths !== 1 && durationMonths !== 12) {
      res.status(400);
      throw new Error("Duration must be either 1 or 12 months");
    }

    // Find passkey and verify student ownership
    const passkey = await PasskeyModel.findOne({
      passkeyId,
      studentId: student._id,
    })
      .populate("courseId", "name description")
      .populate("instituteId", "instituteName");

    if (!passkey) {
      res.status(404);
      throw new Error("Passkey not found or access denied");
    }

    // Calculate renewal price
    const renewalPrice = durationMonths === 1 ? 90 : 990; // ₹90 for 1 month, ₹990 for 12 months

    res.json({
      success: true,
      message: "Passkey renewal information retrieved",
      data: {
        passkeyId: passkey.passkeyId,
        courseId: passkey.courseId,
        courseName: (passkey.courseId as any).name,
        instituteName: (passkey.instituteId as any).instituteName,
        durationMonths,
        renewalPrice,
        currentStatus: passkey.status,
        expiresAt: passkey.expiresAt,
        renewalEligible: true,
        paymentRequired: true,
      },
    });
  }
);

// @desc    Get Student's Enrolled Courses
// @route   GET /api/v2/students/courses
// @access  Private (Student)
export const getStudentCourses = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const student = req.user as any;
    const { status = "all", page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Find student's active passkeys
    let query: any = {
      studentId: student._id,
      status: { $nin: [PasskeyStatus.REVOKED] },
    };

    if (status === "active") {
      query.status = {
        $in: [PasskeyStatus.ACTIVE, PasskeyStatus.FULLY_ACTIVE],
      };
      query.expiresAt = { $gt: new Date() };
    } else if (status === "expired") {
      query.$or = [
        { status: PasskeyStatus.EXPIRED },
        { expiresAt: { $lte: new Date() } },
      ];
    }

    const passkeys = await PasskeyModel.find(query)
      .populate("courseId", "name description")
      .populate("instituteId", "instituteName")
      .sort({ assignedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await PasskeyModel.countDocuments(query);

    // Transform passkeys to course format
    const courses = passkeys.map((passkey) => ({
      passkeyId: passkey.passkeyId,
      courseId: passkey.courseId,
      institute: passkey.instituteId,
      status: passkey.status,
      assignedAt: passkey.assignedAt,
      expiresAt: passkey.expiresAt,

      packageType: passkey.packageType,
      platformFeeStatus: passkey.currentPlatformFeeStatus,
      courseAccessStatus: passkey.hasCourseAccess,
    }));

    res.json({
      success: true,
      message: "Student courses retrieved successfully",
      data: {
        courses,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
        summary: {
          totalCourses: total,
        },
      },
    });
  }
);

// @desc    Get Course Content (MCQs, Notes, Tests)
// @route   GET /api/v2/students/courses/:courseId/content
// @access  Private (Student)
export const getCourseContent = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const student = req.user as any;
    const { contentType = "all" } = req.query;

    // Verify student has access to this course
    const passkey = await PasskeyModel.findOne({
      studentId: student._id,
      courseId,
      status: { $in: [PasskeyStatus.ACTIVE, PasskeyStatus.FULLY_ACTIVE] },
      expiresAt: { $gt: new Date() },
    });

    if (!passkey) {
      res.status(403);
      throw new Error("Access denied. No valid passkey found for this course");
    }

    // Get course details
    const course = await CourseModel.findById(courseId).populate("subjects");

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    // Return course content based on type
    let content: any = {
      course: {
        id: course._id,
        name: course.name,
      },
      subjects: course.subjects || [],
    };

    // Add content type specific data
    if (contentType === "all" || contentType === "mcqs") {
      // In production, you would populate actual MCQs
      content.mcqs = {
        available: true,
        totalQuestions: 0, // Would be calculated from actual data
        categories: [],
      };
    }

    if (contentType === "all" || contentType === "notes") {
      content.notes = {
        available: true,
        totalNotes: 0, // Would be calculated from actual data
        categories: [],
      };
    }

    if (contentType === "all" || contentType === "tests") {
      content.tests = {
        available: true,
        totalTests: 0, // Would be calculated from actual data
        completedTests: 0,
      };
    }

    res.json({
      success: true,
      message: "Course content retrieved successfully",
      data: content,
      access: {
        passkeyId: passkey.passkeyId,
        expiresAt: passkey.expiresAt,
      },
    });
  }
);

// @desc    Submit MCQ Answer
// @route   POST /api/v2/students/courses/:courseId/submit-answer
// @access  Private (Student)
export const submitMCQAnswer = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const { questionId, selectedAnswer, timeSpent } = req.body;
    const student = req.user as any;

    // Verify student has access to this course
    const passkey = await PasskeyModel.findOne({
      studentId: student._id,
      courseId,
      status: { $in: [PasskeyStatus.ACTIVE, PasskeyStatus.FULLY_ACTIVE] },
      expiresAt: { $gt: new Date() },
    });

    if (!passkey) {
      res.status(403);
      throw new Error("Access denied. No valid passkey found for this course");
    }

    if (!questionId || !selectedAnswer) {
      res.status(400);
      throw new Error("Question ID and selected answer are required");
    }

    // In production, you would:
    // 1. Find the actual question
    // 2. Check if answer is correct
    // 3. Save the answer to student progress
    // 4. Update student statistics

    // For now, return a mock response
    const isCorrect = Math.random() > 0.5; // Random for demo

    res.json({
      success: true,
      message: "Answer submitted successfully",
      data: {
        questionId,
        selectedAnswer,
        isCorrect,
        timeSpent: timeSpent || 0,
        explanation: isCorrect
          ? "Correct answer!"
          : "Incorrect. Please review the material.",
        submittedAt: new Date(),
      },
    });
  }
);

// @desc    Get Student Progress
// @route   GET /api/v2/students/progress/:courseId
// @access  Private (Student)
export const getStudentProgress = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const student = req.user as any;

    // Verify student has access to this course
    const passkey = await PasskeyModel.findOne({
      studentId: student._id,
      courseId,
    }).populate("courseId", "name");

    if (!passkey) {
      res.status(404);
      throw new Error("No passkey found for this course");
    }

    // In production, you would aggregate actual progress data
    // For now, return mock progress data
    const progress = {
      course: passkey.courseId,
      student: {
        id: student._id,
        name: student.name,
      },
      overall: {
        completionPercentage: 65,
        totalQuestions: 500,
        answeredQuestions: 325,
        correctAnswers: 260,
        accuracy: 80,
        timeSpent: 3600, // in seconds
        lastActivity: new Date(),
      },
      subjects: [
        {
          subjectId: "subject1",
          name: "Mathematics",
          completionPercentage: 75,
          accuracy: 82,
          questionsAnswered: 150,
          totalQuestions: 200,
        },
        {
          subjectId: "subject2",
          name: "Physics",
          completionPercentage: 55,
          accuracy: 78,
          questionsAnswered: 110,
          totalQuestions: 200,
        },
      ],
      recentActivity: [
        {
          date: new Date(),
          questionsAnswered: 25,
          accuracy: 84,
          timeSpent: 1800,
        },
      ],
      achievements: [
        {
          title: "Speed Demon",
          description: "Answered 50 questions in under 30 minutes",
          earnedAt: new Date(),
        },
      ],
    };

    res.json({
      success: true,
      message: "Student progress retrieved successfully",
      data: progress,
    });
  }
);

// @desc    Get Student Profile
// @route   GET /api/v2/students/profile
// @access  Private (Student)
export const getStudentProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const student = req.user as any;

    // Get student's passkeys for course information
    const passkeys = await PasskeyModel.find({
      studentId: student._id,
    })
      .populate("courseId", "name")
      .populate("instituteId", "instituteName")
      .sort({ assignedAt: -1 });

    // Calculate profile statistics
    const totalCourses = passkeys.length;
    const activeCourses = passkeys.filter(
      (p) =>
        p.status === PasskeyStatus.ACTIVE ||
        p.status === PasskeyStatus.FULLY_ACTIVE
    ).length;
    const expiredCourses = passkeys.filter(
      (p) =>
        p.status === PasskeyStatus.EXPIRED ||
        (p.expiresAt && p.expiresAt <= new Date())
    ).length;

    const profile = {
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        phoneNumber: student.phoneNumber,
        deviceId: student.deviceId,
        joinedAt: student.createdAt,
      },
      statistics: {
        totalCourses,
        activeCourses,
        expiredCourses,
        totalAccessCount: passkeys.reduce(
          (sum, p) => sum + (p.accessCount || 0),
          0
        ),
        lastActivity:
          passkeys.length > 0
            ? Math.max(...passkeys.map((p) => p.lastAccessedAt?.getTime() || 0))
            : null,
      },
      courses: passkeys.map((passkey) => ({
        passkeyId: passkey.passkeyId,
        course: passkey.courseId,
        institute: passkey.instituteId,
        status: passkey.status,
        assignedAt: passkey.assignedAt,
        expiresAt: passkey.expiresAt,
        packageType: passkey.packageType,
      })),
      recentActivity: [
        // In production, this would come from actual activity logs
      ],
    };

    res.json({
      success: true,
      message: "Student profile retrieved successfully",
      data: profile,
    });
  }
);

// @desc    Update Student Profile
// @route   PUT /api/v2/students/profile
// @access  Private (Student)
export const updateStudentProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const student = req.user as any;
    const { name, email, phoneNumber } = req.body;

    // Validate input
    if (!name && !email && !phoneNumber) {
      res.status(400);
      throw new Error("At least one field is required to update");
    }

    // Build update object
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;

    // Update student
    const updatedStudent = await StudentModel.findByIdAndUpdate(
      student._id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      res.status(404);
      throw new Error("Student not found");
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        student: {
          id: updatedStudent._id,
          name: updatedStudent.name,
          email: updatedStudent.email,
          updatedAt: updatedStudent.updatedAt,
        },
      },
    });
  }
);

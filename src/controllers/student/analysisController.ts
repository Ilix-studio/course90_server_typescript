import { PasskeyStatus } from "../../constants/enums";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { PasskeyModel } from "../../models/passkeys/passkeyModel";
import { SubmissionModel } from "../../models/submission/submissionModel";

// @desc    Get student performance analysis
// @route   GET /api/v2/students/analysis
// @access  Private (Student)
export const getStudentAnalysis = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const student = req.studentUser;

    // Get all submissions for this student
    const submissions = await SubmissionModel.find({})
      .populate("course", "name")
      .sort({ submittedAt: -1 });

    const feedSubmissions = await SubmissionModel.find({
      type: "PQ", // Published Questions
    })
      .populate("course", "name")
      .sort({ submittedAt: -1 });

    // Calculate analytics
    const totalAttempts = submissions.length + feedSubmissions.length;
    const totalScore = [...submissions, ...feedSubmissions].reduce(
      (sum, sub) => sum + sub.score,
      0
    );
    const totalQuestions = [...submissions, ...feedSubmissions].reduce(
      (sum, sub) => sum + sub.totalQuestions,
      0
    );

    const averageScore =
      totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;

    res.json({
      success: true,
      message: "Student analysis retrieved successfully",
      data: {
        totalAttempts,
        averageScore: Math.round(averageScore),
        totalCorrectAnswers: totalScore,
        totalQuestions,
        recentSubmissions: [...submissions, ...feedSubmissions].slice(0, 10),
      },
    });
  }
);

// @desc    Get student progress for a specific course
// @route   GET /api/v2/students/progress/:courseId
// @access  Private (Student)
export const getStudentProgress = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const student = req.studentUser;

    // Verify course access
    const passkey = await PasskeyModel.findOne({
      studentId: student?._id,
      courseId,
      status: { $in: [PasskeyStatus.ACTIVE, PasskeyStatus.FULLY_ACTIVE] },
      expiresAt: { $gt: new Date() },
    });

    if (!passkey) {
      res.status(403);
      throw new Error("Access denied to this course");
    }

    // Get submissions for this course
    const submissions = await SubmissionModel.find({ course: courseId })
      .populate("questionSet")
      .sort({ submittedAt: -1 });
    const feedSubmissions = await SubmissionModel.find({
      type: "PQ", // Published Questions
      course: courseId,
    })
      .populate("course", "name")
      .sort({ submittedAt: -1 });

    // Calculate course-specific metrics
    const totalAttempts = submissions.length + feedSubmissions.length;
    const totalScore = [...submissions, ...feedSubmissions].reduce(
      (sum, sub) => sum + sub.score,
      0
    );
    const totalQuestions = [...submissions, ...feedSubmissions].reduce(
      (sum, sub) => sum + sub.totalQuestions,
      0
    );

    const courseAverage =
      totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;

    res.json({
      success: true,
      message: "Course progress retrieved successfully",
      data: {
        courseId,
        totalAttempts,
        courseAverage: Math.round(courseAverage),
        totalCorrectAnswers: totalScore,
        totalQuestions,
        submissions: [...submissions, ...feedSubmissions].slice(0, 20),
      },
    });
  }
);

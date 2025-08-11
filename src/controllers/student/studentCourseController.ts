import { PasskeyStatus } from "../../constants/enums";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Subject } from "../../models/course/subjectModel";
import { PublishedMock } from "../../models/mcq/feedMCQ";
import { GeneralMCQModel } from "../../models/mcq/generalMCQ";
import { LongNoteModel } from "../../models/mcq/longNoteModel";
import { MockMCQModel } from "../../models/mcq/mockMCQ";
import { PasskeyModel } from "../../models/passkeys/passkeyModel";

// @desc    Get courses accessible by student's passkey
// @route   GET /api/v2/courseAccess/courses
// @access  Private (Student)
export const getCoursesByPasskey = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const passkeyId = req.headers.passkeyId as string;

    if (!passkeyId) {
      res.status(400);
      throw new Error("Passkey ID not found in token");
    }

    // Find passkey and populate course details
    const passkey = await PasskeyModel.findOne({ passkeyId }).populate(
      "courseId",
      "name description thumbnail"
    );

    if (!passkey) {
      res.status(404);
      throw new Error("Course not found");
    }

    const course = passkey.courseId as any;

    // Count total subjects for this course
    const totalSubjects = await Subject.countDocuments({
      courseId: course._id,
      isActive: true,
    });

    res.json({
      success: true,
      message: "Course details retrieved successfully",
      data: {
        courseId: course._id,
        name: course.name,
        description: course.description,
        thumbnail: course.thumbnail,
        totalSubjects: totalSubjects,
        passkeyId: passkey.passkeyId,
      },
    });
  }
);
// @desc    Get subjects for a specific course
// @route   GET /api/v2/courseAccess/courses/:courseId/subjects
// @access  Private (Student)
export const getCourseSubjects = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;

    // Access already validated by hasAccessToCourse middleware, so we can proceed directly
    const subjects = await Subject.find({
      courseId,
      isActive: true,
    }).select("name description generalMCQs mockMCQs publishedMock longNotes");

    console.log(`Found ${subjects.length} subjects for course ${courseId}`);

    res.json({
      success: true,
      message: "Subjects retrieved successfully",
      data: subjects,
    });
  }
);

// @desc    Get general MCQs for a course
// @route   GET /api/v2/courseAccess/courses/:courseId/general-mcqs
// @access  Private (Student)
export const getGeneralMCQs = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const { subjectId } = req.query;

    // Access already validated by hasAccessToCourse middleware
    const query: any = { courseId };
    if (subjectId) {
      query.subjectId = subjectId;
    }

    const generalMCQs = await GeneralMCQModel.find(query)
      .select("-mcqs.correctOption") // Hide correct answers
      .populate("subjectId", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: "General MCQs retrieved successfully",
      data: generalMCQs,
    });
  }
);

// @desc    Get mock MCQs for a course
// @route   GET /api/v2/courseAccess/courses/:courseId/mock-mcqs
// @access  Private (Student)
export const getMockMCQs = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const { subjectId } = req.query;

    const query: any = { courseId };
    if (subjectId) {
      query.subjectId = subjectId;
    }

    const mockMCQs = await MockMCQModel.find(query)
      .select("-mcqs.correctOption") // Hide correct answers
      .populate("subjectId", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: "Mock MCQs retrieved successfully",
      data: mockMCQs,
    });
  }
);

// @desc    Get published mocks for a course
// @route   GET /api/v2/courseAccess/courses/:courseId/published-mocks
// @access  Private (Student)
export const getPublishedMocks = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const { subjectId } = req.query;

    const query: any = { courseId };
    if (subjectId) {
      query.subjectId = subjectId;
    }

    const publishedMocks = await PublishedMock.find(query)
      .select("-mcqs.correctOption") // Hide correct answers
      .populate("subjectId", "name")
      .sort({ publishedAt: -1 });

    res.json({
      success: true,
      message: "Published mocks retrieved successfully",
      data: publishedMocks,
    });
  }
);

// @desc    Get long notes for a course
// @route   GET /api/v2/courseAccess/courses/:courseId/notes
// @access  Private (Student)
export const getLongNotes = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const { subjectId } = req.query;
    const student = req.studentUser;

    const query: any = { courseId };
    if (subjectId) {
      query.subjectId = subjectId;
    }

    const notes = await LongNoteModel.find(query)
      .populate("subjectId", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: "Notes retrieved successfully",
      data: notes,
    });
  }
);

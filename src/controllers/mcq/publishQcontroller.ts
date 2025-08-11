// publishQcontroller.ts
import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { IMCQ } from "../../types/mcq.types";
import { PublishedMock } from "../../models/mcq/feedMCQ";
import { Types } from "mongoose";
import {
  getInstituteId,
  createAccessDeniedError,
  isSuperAdmin,
} from "../../utils/authUtils";

interface IPublishMockBody {
  courseId: string;
  subjectId: string;
  language: string;
  title: string;
  // publishedBy: string;
  mcqs?: IMCQ[];
}

// Create/Publish Mock Test (with institute validation)
export const publishMockTest = asyncHandler(
  async (req: Request, res: Response) => {
    const { courseId, subjectId, language, title }: IPublishMockBody = req.body;

    // Validate required fields
    if (!courseId || !subjectId || !language || !title) {
      res.status(400);
      throw new Error("Please provide all required fields");
    }

    // Validate courseId format
    if (!Types.ObjectId.isValid(courseId)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    if (!Types.ObjectId.isValid(subjectId)) {
      res.status(400);
      throw new Error("Invalid subject ID format");
    }

    // Extract instituteId from authenticated user's token
    const instituteId = getInstituteId(req);

    const publishedMock = await PublishedMock.create({
      instituteId, // Add institute ID for data isolation
      courseId,
      subjectId,
      language,
      title,
      mcqs: [],
    });

    if (!publishedMock) {
      res.status(400);
      throw new Error("Failed to publish mock test");
    }

    res.status(201).json({
      success: true,
      message: "Mock test published successfully",
      publishQSetId: publishedMock._id,
      data: publishedMock,
    });
  }
);

// Get all published questions (filtered by institute or global for SuperAdmin)
export const getPublishQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const { courseId, subjectId } = req.query;

    let query: any = {};

    // SuperAdmin can see all published questions, others only their institute's
    if (!isSuperAdmin(req)) {
      const instituteId = getInstituteId(req);
      query.instituteId = instituteId;
    }

    // Add additional filters if provided
    if (courseId) query.courseId = courseId;
    if (subjectId) query.subjectId = subjectId;

    const feedQuestions = await PublishedMock.find(query).sort({
      publishedAt: -1,
    });

    if (!feedQuestions || feedQuestions.length === 0) {
      res.status(404).json({
        success: false,
        message: "No published questions found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      count: feedQuestions.length,
      data: feedQuestions,
    });
  }
);

// Get published question by ID (with institute validation)
export const getPQbyID = asyncHandler(async (req: Request, res: Response) => {
  const { publishQSetId } = req.params;

  // Validate ObjectId format
  if (!Types.ObjectId.isValid(publishQSetId)) {
    res.status(400);
    throw new Error("Invalid question set ID format");
  }

  let query: any = { _id: publishQSetId };

  // SuperAdmin can access any published question, others only their institute's
  if (!isSuperAdmin(req)) {
    const instituteId = getInstituteId(req);
    query.instituteId = instituteId;
  }

  const publishQuestionSet = await PublishedMock.findOne(query);

  if (!publishQuestionSet) {
    res.status(404);
    throw createAccessDeniedError("Published Question Set");
  }

  res.status(200).json({
    success: true,
    data: publishQuestionSet,
  });
});

// Add MCQ to published question set (with institute validation and weekly limit)
export const addMCQforPQ = asyncHandler(async (req: Request, res: Response) => {
  const { publishQSetId } = req.params;
  const { questionName, options, correctOption }: IMCQ = req.body;

  // Validate ObjectId format
  if (!Types.ObjectId.isValid(publishQSetId)) {
    res.status(400);
    throw new Error("Invalid question set ID format");
  }

  // Validate required fields
  if (!questionName || !options || correctOption === undefined) {
    res.status(400);
    throw new Error("Please provide all MCQ fields");
  }

  // Validate options and correctOption
  if (
    !Array.isArray(options) ||
    options.length === 0 ||
    correctOption < 0 ||
    correctOption >= options.length
  ) {
    res.status(400);
    throw new Error("Invalid options or correct option");
  }

  const instituteId = getInstituteId(req);

  // Check weekly question limit (only for non-SuperAdmin users)
  if (!isSuperAdmin(req)) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentQuestionsCount = await PublishedMock.aggregate([
      {
        $match: {
          instituteId: instituteId,
          publishedAt: { $gte: oneWeekAgo },
        },
      },
      {
        $project: {
          mcqCount: { $size: "$mcqs" },
        },
      },
      {
        $group: {
          _id: null,
          totalMCQs: { $sum: "$mcqCount" },
        },
      },
    ]);

    const weeklyQuestionCount = recentQuestionsCount[0]?.totalMCQs || 0;

    if (weeklyQuestionCount >= 10) {
      res.status(429); // Too Many Requests
      throw new Error(
        "Weekly question limit (10) reached. Please try again after some time."
      );
    }
  }

  // Find question set with institute validation
  const feedQuestion = await PublishedMock.findOne({
    _id: publishQSetId,
    instituteId,
  });

  if (!feedQuestion) {
    res.status(404);
    throw createAccessDeniedError("Published question set");
  }

  // Add the MCQ
  feedQuestion.mcqs.push({
    _id: new Types.ObjectId(),
    questionName,
    options,
    correctOption,
  });
  await feedQuestion.save();

  // Calculate remaining questions for this week (only for non-SuperAdmin)
  let questionsRemainingThisWeek = null;
  if (!isSuperAdmin(req)) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const currentCount = await PublishedMock.aggregate([
      {
        $match: {
          instituteId: instituteId,
          publishedAt: { $gte: oneWeekAgo },
        },
      },
      {
        $project: {
          mcqCount: { $size: "$mcqs" },
        },
      },
      {
        $group: {
          _id: null,
          totalMCQs: { $sum: "$mcqCount" },
        },
      },
    ]);

    const currentWeeklyCount = currentCount[0]?.totalMCQs || 0;
    questionsRemainingThisWeek = Math.max(0, 10 - currentWeeklyCount);
  }

  res.status(200).json({
    success: true,
    message: "MCQ added successfully",
    publishQSetId: publishQSetId,
    ...(questionsRemainingThisWeek !== null && {
      questionsRemainingThisWeek,
    }),
    data: feedQuestion,
  });
});

// Update published question metadata (with institute validation)
export const updatePQ = asyncHandler(async (req: Request, res: Response) => {
  const { publishQSetId } = req.params;
  const updates: Partial<IPublishMockBody> = req.body;

  // Validate ObjectId format
  if (!Types.ObjectId.isValid(publishQSetId)) {
    res.status(400);
    throw new Error("Invalid question set ID format");
  }

  // Validate courseId format if provided
  if (updates.courseId && !Types.ObjectId.isValid(updates.courseId)) {
    res.status(400);
    throw new Error("Invalid course ID format");
  }

  const instituteId = getInstituteId(req);

  // Find and update with institute validation
  const updatedFeedQuestion = await PublishedMock.findOneAndUpdate(
    {
      _id: publishQSetId,
      instituteId, // Ensure institute ownership
    },
    {
      $set: {
        ...(updates.courseId && { courseId: updates.courseId }),
        ...(updates.subjectId && { subjectId: updates.subjectId }),
        ...(updates.language && { language: updates.language }),
        ...(updates.title && { title: updates.title }),
      },
    },
    { new: true, runValidators: true }
  );

  if (!updatedFeedQuestion) {
    res.status(404);
    throw createAccessDeniedError("Published question set");
  }

  res.status(200).json({
    success: true,
    message: "Published question updated successfully",
    data: updatedFeedQuestion,
  });
});

// Update specific MCQ in published question set (with institute validation)
export const updatePQ_MCQ = asyncHandler(
  async (req: Request, res: Response) => {
    const { publishQSetId, mcqId } = req.params;
    const updates: Partial<IMCQ> = req.body;

    // Validate IDs format
    if (
      !Types.ObjectId.isValid(publishQSetId) ||
      !Types.ObjectId.isValid(mcqId)
    ) {
      res.status(400);
      throw new Error("Invalid ID format");
    }

    const instituteId = getInstituteId(req);

    // Find the question set with institute validation
    const feedQuestion = await PublishedMock.findOne({
      _id: publishQSetId,
      instituteId,
    });

    if (!feedQuestion) {
      res.status(404);
      throw createAccessDeniedError("Published question set");
    }

    // Find the specific MCQ
    const mcqIndex = feedQuestion.mcqs.findIndex(
      (mcq) => mcq._id?.toString() === mcqId
    );

    if (mcqIndex === -1) {
      res.status(404);
      throw new Error("MCQ not found in question set");
    }

    // Validate options and correctOption if provided
    if (updates.options || updates.correctOption !== undefined) {
      const newOptions = updates.options ?? feedQuestion.mcqs[mcqIndex].options;
      const newCorrectOption =
        updates.correctOption ?? feedQuestion.mcqs[mcqIndex].correctOption;

      if (newCorrectOption < 0 || newCorrectOption >= newOptions.length) {
        res.status(400);
        throw new Error(
          "correctOption must be a valid index of the options array"
        );
      }
    }

    // Update MCQ fields
    feedQuestion.mcqs[mcqIndex] = {
      ...feedQuestion.mcqs[mcqIndex],
      ...updates,
    };

    await feedQuestion.save();

    res.status(200).json({
      success: true,
      message: "MCQ updated successfully",
      data: feedQuestion.mcqs[mcqIndex],
    });
  }
);

// Delete published question set (with institute validation)
export const deletePQ = asyncHandler(async (req: Request, res: Response) => {
  const { publishQSetId } = req.params;

  // Validate ObjectId format
  if (!Types.ObjectId.isValid(publishQSetId)) {
    res.status(400);
    throw new Error("Invalid question set ID format");
  }

  const instituteId = getInstituteId(req);

  // Find the question set with institute validation
  const feedQuestion = await PublishedMock.findOne({
    _id: publishQSetId,
    instituteId,
  });

  if (!feedQuestion) {
    res.status(404);
    throw createAccessDeniedError("Published question set");
  }

  // Check if there are 6 or more MCQs
  if (feedQuestion.mcqs.length >= 6) {
    res.status(403).json({
      success: false,
      message: "Cannot delete question set with 6 or more questions",
    });
    return;
  }

  // Delete the question set
  await feedQuestion.deleteOne();

  res.status(200).json({
    success: true,
    message: "Published question deleted successfully",
    data: null,
  });
});

// Delete specific MCQ from published question set (with institute validation)
export const deletePQ_MCQ = asyncHandler(
  async (req: Request, res: Response) => {
    const { publishQSetId, mcqId } = req.params;

    // Validate IDs format
    if (
      !Types.ObjectId.isValid(publishQSetId) ||
      !Types.ObjectId.isValid(mcqId)
    ) {
      res.status(400);
      throw new Error("Invalid ID format");
    }

    const instituteId = getInstituteId(req);

    // Find and update the question set
    const result = await PublishedMock.findOneAndUpdate(
      {
        _id: publishQSetId,
        instituteId, // Ensure institute ownership
      },
      {
        $pull: { mcqs: { _id: new Types.ObjectId(mcqId) } },
      },
      { new: true }
    );

    if (!result) {
      res.status(404);
      throw createAccessDeniedError("Published question set");
    }

    res.status(200).json({
      success: true,
      message: "MCQ deleted successfully",
      data: result,
    });
  }
);
export const deletePQ_mcqId = () => {};

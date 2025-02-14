import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { IMCQ } from "../../types/mcq.types";
import { PublishedMock } from "../../models/mcq/feedMCQ";
import { AuthenticatedRequest } from "../../types/request.types";
import { Types } from "mongoose";

interface IPublishMockBody {
  courseId: string;
  subject: string;
  language: string;
  title: string;
  publishedBy: string;
  mcqs: IMCQ[];
}

export const publishMockTest = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      courseId,
      subject,
      language,
      title,
      publishedBy,
    }: IPublishMockBody = req.body;

    if (!courseId || !subject || !language || !title) {
      res.status(400);
      throw new Error("Please provide all required fields");
    }
    // Validate courseId format
    if (!Types.ObjectId.isValid(courseId)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    const publishedMock = await PublishedMock.create({
      courseId,
      subject,
      language,
      title,
      mcqs: [],
      publishedBy,
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
// FOr students
// export const getFeedMockTests = asyncHandler(
//   async (req: Request, res: Response) => {}
// );

// Get all the Feed Question
export const getPublishQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const { courseId, subject } = req.query;

    const query: any = {};
    if (courseId) query.courseId = courseId;
    if (subject) query.subject = subject;

    const feedQuestions = await PublishedMock.find(query).sort({
      publishedAt: -1,
    });

    if (!feedQuestions || feedQuestions.length === 0) {
      res.status(404);
      throw new Error("No feed questions found");
    }

    res.status(200).json({
      success: true,
      count: feedQuestions.length,
      data: feedQuestions,
    });
  }
);

// create the Feed Question and insert MCQ form
export const addMCQforPQ = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { publishQSetId } = req.params;
    const { questionName, options, correctOption }: IMCQ = req.body;
    const instituteId = req.institute?._id;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(publishQSetId)) {
      res.status(400);
      throw new Error("Invalid question set ID format");
    }

    if (!instituteId) {
      res.status(401);
      throw new Error("Not authenticated");
    }

    if (!questionName || !options || correctOption === undefined) {
      res.status(400);
      throw new Error("Please provide all MCQ fields");
    }

    // Calculate the date 7 days ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Count questions added in the last week
    const recentQuestionsCount = await PublishedMock.aggregate([
      {
        $match: {
          instituteId: instituteId.toString(),
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

    const feedQuestion = await PublishedMock.findById(publishQSetId);

    if (!feedQuestion) {
      res.status(404);
      throw new Error("Feed question not found");
    }

    // Verify institute ownership
    // if (feedQuestion.instituteId.toString() !== instituteId.toString()) {
    //   res.status(403);
    //   throw new Error("Not authorized to modify this feed question");
    // }

    feedQuestion.mcqs.push({ questionName, options, correctOption });
    await feedQuestion.save();

    res.status(200).json({
      success: true,
      message: "MCQ added successfully",
      publishQSetId: publishQSetId,
      questionsRemainingThisWeek: 10 - (weeklyQuestionCount + 1),
      data: feedQuestion,
    });
  }
);

// update the Feed Question
export const updatePQ = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { publishQSetId } = req.params;
    const updates = req.body;

    const feedQuestion = await PublishedMock.findById(publishQSetId);

    if (!feedQuestion) {
      res.status(404);
      throw new Error("Feed question not found");
    }

    // Verify institute ownership
    // if (feedQuestion.instituteId.toString() !== req.institute?._id.toString()) {
    //   res.status(403);
    //   throw new Error("Not authorized to modify this feed question");
    // }

    const updatedFeedQuestion = await PublishedMock.findByIdAndUpdate(
      publishQSetId,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Feed question updated successfully",
      data: updatedFeedQuestion,
    });
  }
);

// update  MCQ form
export const updatePQ_MCQ = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { publishQSetId } = req.params;
    const { mcqId } = req.query;
    const updates: Partial<IMCQ> = req.body;

    const feedQuestion = await PublishedMock.findById(publishQSetId);

    if (!feedQuestion) {
      res.status(404);
      throw new Error("Feed question not found");
    }

    const mcqIndex = feedQuestion.mcqs.findIndex(
      (mcq) => (mcq._id as Types.ObjectId).toString() === mcqId
    );

    if (!mcqIndex) {
      res.status(404);
      throw new Error("MCQ not found");
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

// delete the Feed Question
export const deletePQ = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { publishQSetId } = req.params;

    const feedQuestion = await PublishedMock.findById(publishQSetId);

    if (!feedQuestion) {
      res.status(404);
      throw new Error("Feed question not found");
    }

    // Verify institute ownership
    if (feedQuestion.instituteId.toString() !== req.institute?._id.toString()) {
      res.status(403);
      throw new Error("Not authorized to delete this feed question");
    }

    await PublishedMock.findByIdAndDelete(publishQSetId);

    res.status(200).json({
      success: true,
      message: "Feed question deleted successfully",
      data: null,
    });
  }
);

import { Request, Response } from "express";
import { PublishedMock } from "../../models/mcq/feedMCQ";
import asyncHandler from "express-async-handler";
import { AnswerSubmission } from "../../types/submission.types";
import { IMCQ } from "../../types/mcq.types";
import { FeedSubmissionModel } from "../../models/submission/ForPublishSubmission";

// Get all published mock tests
const getFeedMockTests = asyncHandler(async (req: Request, res: Response) => {
  const publishedTests = await PublishedMock.find()
    .select("-mcqs.correctOption") // Hide correct answers from students
    .sort({ publishedAt: -1 }); // Sort by latest first

  res.json(publishedTests);
});

// Submit answers for a published MCQ test
const submitPublishedMCQ = asyncHandler(async (req: Request, res: Response) => {
  const { questionSetId, answers } = req.body as {
    questionSetId: string;
    answers: AnswerSubmission[];
  };

  // Validate required fields
  if (!questionSetId || !answers || !Array.isArray(answers)) {
    res.status(400);
    throw new Error("Question set ID and answers are required");
  }

  // Find the published test
  const feedTest = await PublishedMock.findById(questionSetId);
  if (!feedTest) {
    res.status(404);
    throw new Error("Published test not found");
  }

  // Validate that answers array is not empty
  if (answers.length === 0) {
    res.status(400);
    throw new Error("At least one answer is required");
  }

  let score = 0;
  const processedAnswers = answers.map((answer) => {
    // Validate each answer object
    if (!answer.questionId || answer.selectedOption === undefined) {
      throw new Error(
        "Invalid answer format: questionId and selectedOption are required"
      );
    }

    // Find the corresponding question
    const question = feedTest.mcqs.find(
      (mcq: IMCQ) => mcq._id?.toString() === answer.questionId
    );

    if (!question) {
      throw new Error(
        `Question with ID ${answer.questionId} not found in test`
      );
    }

    // Check if the selected option is correct
    const isCorrect = question.correctOption === answer.selectedOption;
    if (isCorrect) score++;

    return {
      questionId: answer.questionId,
      selectedOption: answer.selectedOption,
      isCorrect,
      timeTaken: answer.timeTaken || 0, // Default to 0 if not provided
    };
  });

  // Create the submission
  const submission = await FeedSubmissionModel.create({
    course: feedTest.courseId, // Uses courseId from the feedTest
    questionSet: questionSetId,
    answers: processedAnswers,
    score,
    totalQuestions: feedTest.mcqs.length,
  });

  res.status(201).json({
    success: true,
    message: "Submission recorded successfully",
    data: {
      submissionId: submission._id,
      score,
      totalQuestions: feedTest.mcqs.length,
      percentage: Math.round((score / feedTest.mcqs.length) * 100),
    },
  });
});

export { getFeedMockTests, submitPublishedMCQ };

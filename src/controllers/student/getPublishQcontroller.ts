import { Request, Response } from "express";
import { PublishedMock } from "../../models/mcq/feedMCQ";
import asyncHandler from "express-async-handler";
import { AnswerSubmission } from "../../types/submission.types";
import { IMCQ } from "../../types/mcq.types";
import { FeedSubmissionModel } from "../../models/submission/ForPublishSubmission";

//Get
const getFeedMockTests = asyncHandler(async (req: Request, res: Response) => {
  const publishedTests = await PublishedMock.find()
    .select("-mcqs.correctOption")
    .sort("-publishedAt");

  res.json(publishedTests);
});

const submitPublishedMCQ = asyncHandler(async (req: Request, res: Response) => {
  const { questionSetId, answers } = req.body as {
    questionSetId: string;
    answers: AnswerSubmission[];
  };

  const feedTest = await PublishedMock.findById(questionSetId);
  if (!feedTest) {
    res.status(404);
    throw new Error("Feed test not found");
  }

  let score = 0;
  const processedAnswers = answers.map((answer) => {
    const question = feedTest.mcqs.find(
      (mcq: IMCQ) => mcq._id?.toString() === answer.questionId
    );
    const isCorrect = question?.correctOption === answer.selectedOption;
    if (isCorrect) score++;

    return {
      questionId: answer.questionId,
      selectedOption: answer.selectedOption,
      isCorrect,
      timeTaken: answer.timeTaken,
    };
  });

  const submission = await FeedSubmissionModel.create({
    course: feedTest.courseId,
    questionSet: questionSetId,
    answers: processedAnswers,
    score,
    totalQuestions: feedTest.mcqs.length,
  });

  res.status(201).json(submission);
});

export { getFeedMockTests, submitPublishedMCQ };

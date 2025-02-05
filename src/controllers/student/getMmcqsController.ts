import { MockMCQModel, PerformanceMCQSchema } from "../../models/mcq/mockMCQ";
import { SubmissionModel } from "../../models/submission/submissionModel";
import { AnswerSubmission } from "../../types/submission.types";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

export const getMockMCQs = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;

  const mockTests = await MockMCQModel.find({
    courseId,
  }).select("-mcqs.correctOption");

  res.json(mockTests);
});

export const submitMockMCQ = asyncHandler(
  async (req: Request, res: Response) => {
    const { questionSetId, answers } = req.body as {
      questionSetId: string;
      answers: AnswerSubmission[];
    };

    const mockTest = await MockMCQModel.findById(questionSetId);
    if (!mockTest) {
      res.status(404);
      throw new Error("Mock test not found");
    }

    let score = 0;
    const processedAnswers = answers.map((answer) => {
      const question = mockTest.mcqs.find(
        (mcq: PerformanceMCQSchema) => mcq._id.toString() === answer.questionId
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

    const submission = await SubmissionModel.create({
      institute: mockTest.courseId,
      course: mockTest.courseId,
      type: "MQ",
      questionSet: questionSetId,
      answers: processedAnswers,
      score,
      totalQuestions: mockTest.mcqs.length,
    });

    res.status(201).json(submission);
  }
);

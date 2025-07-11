import { GeneralMCQModel } from "../../models/mcq/generalMCQ";
import { SubmissionModel } from "../../models/submission/submissionModel";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

export const getGeneralMCQs = asyncHandler(
  async (req: Request, res: Response) => {
    const { courseId } = req.params;

    // Fixed: Use 'courseId' instead of 'course' to match the schema
    const mcqs = await GeneralMCQModel.find({
      courseId: courseId,
    }).select("-mcqs.correctOption");

    res.json(mcqs);
  }
);

export const submitGeneralMCQ = asyncHandler(
  async (req: Request, res: Response) => {
    const { questionSetId, answers } = req.body;

    const questionSet = await GeneralMCQModel.findById(questionSetId);
    if (!questionSet) {
      res.status(404);
      throw new Error("Question set not found");
    }

    let score = 0;
    const processedAnswers = answers.map((answer: any) => {
      const question = questionSet.mcqs.find(
        (mcq) => mcq._id.toString() === answer.questionId
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
      // Fixed: Use 'courseId' instead of 'course' to get the correct field value
      institute: questionSet.instituteId, // Add institute field
      course: questionSet.courseId, // Use courseId from the questionSet
      type: "GQ",
      questionSet: questionSetId,
      answers: processedAnswers,
      score,
      totalQuestions: questionSet.mcqs.length,
    });

    res.status(201).json(submission);
  }
);

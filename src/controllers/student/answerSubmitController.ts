import { PasskeyStatus } from "../../constants/enums";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { PublishedMock } from "../../models/mcq/feedMCQ";
import { GeneralMCQModel } from "../../models/mcq/generalMCQ";
import { MockMCQModel } from "../../models/mcq/mockMCQ";
import { PasskeyModel } from "../../models/passkeys/passkeyModel";
import { SubmissionModel } from "../../models/submission/submissionModel";
import { AnswerSubmission } from "../../types/submission.types";

// @desc    Submit general MCQ answers
// @route   POST /api/v2/courseAccess/submit/general
// @access  Private (Student)
export const submitGeneralMCQ = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId, subjectId } = req.params; // ✅ Get both courseId and subjectId from params
    const { generalQSetId, answers, deviceId } = req.body as {
      generalQSetId: string;
      answers: AnswerSubmission[];
      deviceId: string;
    };
    const student = req.studentUser;

    // ✅ Validate student exists (TypeScript safety)
    if (!student) {
      res.status(401);
      throw new Error("Student authentication required");
    }

    // Validate required fields
    if (!generalQSetId || !answers || !Array.isArray(answers) || !deviceId) {
      res.status(400);
      throw new Error(
        "General question set ID, answers, and deviceId are required"
      );
    }

    // Validate answers array is not empty
    if (answers.length === 0) {
      res.status(400);
      throw new Error("At least one answer is required");
    }

    // Find the general MCQ set
    const generalSet = await GeneralMCQModel.findById(generalQSetId);
    if (!generalSet) {
      res.status(404);
      throw new Error("General MCQ set not found");
    }

    // Verify the generalSet belongs to the requested course
    if (generalSet.courseId.toString() !== courseId) {
      res.status(403);
      throw new Error("Question set does not belong to this course");
    }

    // ✅ Verify the generalSet belongs to the requested subject
    if (generalSet.subjectId.toString() !== subjectId) {
      res.status(403);
      throw new Error("Question set does not belong to this subject");
    }

    // ✅ Additional validation - ensure subjectId exists (not null/undefined)
    if (!generalSet.subjectId) {
      res.status(400);
      throw new Error("Question set is missing subject information");
    }

    // ✅ Validate student exists (TypeScript safety)
    if (!student) {
      res.status(401);
      throw new Error("Student authentication required");
    }

    // ✅ Get the active passkey from student object
    const activePasskey = student.getActivePasskey();
    if (!activePasskey) {
      res.status(403);
      throw new Error("No active passkey found for student");
    }

    // ✅ Since hasAccessToCourse middleware already validated access, get passkey for submission
    const passkey = await PasskeyModel.findOne({
      passkeyId: activePasskey.passkeyId,
      courseId: courseId,
    });

    if (!passkey) {
      res.status(403);
      throw new Error("Unable to find passkey for submission");
    }

    // Process answers and calculate score
    let score = 0;
    const processedAnswers = answers.map((answer) => {
      // Find the question in the MCQ set
      const question = generalSet.mcqs.find(
        (mcq) => mcq._id?.toString() === answer.questionId
      );

      if (!question) {
        throw new Error(
          `Question ${answer.questionId} not found in this question set`
        );
      }

      // Validate selectedOption is within valid range
      if (
        answer.selectedOption < 0 ||
        answer.selectedOption >= question.options.length
      ) {
        throw new Error(
          `Invalid option selected for question ${answer.questionId}`
        );
      }

      // Check if answer is correct
      const isCorrect = question.correctOption === answer.selectedOption;
      if (isCorrect) score++;

      return {
        questionId: answer.questionId,
        selectedOption: answer.selectedOption,
        correctOption: question.correctOption,
        isCorrect,
        timeTaken: answer.timeTaken || 0,
      };
    });

    // Calculate additional metrics
    const totalQuestions = generalSet.mcqs.length;
    const correctAnswers = score;
    const wrongAnswers = totalQuestions - correctAnswers;
    const percentage = Math.round((score / totalQuestions) * 100);
    const totalTimeTaken = processedAnswers.reduce(
      (total, answer) => total + answer.timeTaken,
      0
    );
    const averageTimePerQuestion =
      totalQuestions > 0 ? totalTimeTaken / totalQuestions : 0;

    // Create submission with all required fields
    const submission = await SubmissionModel.create({
      // Student identification
      studentId: student._id,
      passkeyId: activePasskey.passkeyId, // ✅ Use passkeyId from active passkey
      deviceId,

      // Institutional references
      instituteId: generalSet.instituteId,
      courseId: generalSet.courseId,
      subjectId: generalSet.subjectId, // ✅ Now properly validated

      // Question set information
      type: "GQ",
      questionSetId: generalQSetId,
      questionSetTitle: generalSet.topic, // Optional: add question set title

      // Submission data
      answers: processedAnswers,

      // Scoring information
      score,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      percentage,

      // Time tracking
      totalTimeTaken,
      averageTimePerQuestion,

      // Metadata
      submittedAt: new Date(),
      submissionStatus: "COMPLETED",
    });

    // ✅ Update passkey access count (optional analytics)
    if (passkey.accessCount !== undefined) {
      passkey.accessCount = (passkey.accessCount || 0) + 1;

      // Add status history entry for tracking student usage
      passkey.statusHistory.push({
        status: passkey.status, // Keep current status
        changedAt: new Date(),
        reason: "MCQ submission completed",
      });

      await passkey.save();
    }

    // Return comprehensive response
    res.status(201).json({
      success: true,
      message: "General MCQ submission recorded successfully",
      data: {
        submissionId: submission._id,
        score,
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        percentage,
        totalTimeTaken,
        averageTimePerQuestion,
        submissionStatus: "COMPLETED",
        submittedAt: submission.submittedAt,
        questionSetInfo: {
          id: generalSet._id,
          topic: generalSet.topic,
          language: generalSet.language,
          courseId: generalSet.courseId,
          subjectId: generalSet.subjectId,
        },
      },
    });
  }
);

// @desc    Submit mock MCQ answers
// @route   POST /api/v2/courseAccess/submit/mock
// @access  Private (Student)
export const submitMockMCQ = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { mockQSetId, answers, deviceId } = req.body as {
      mockQSetId: string;
      answers: AnswerSubmission[];
      deviceId: string;
    };
    const student = req.studentUser;

    if (!mockQSetId || !answers || !Array.isArray(answers) || !deviceId) {
      res.status(400);
      throw new Error(
        "Mock question set ID, answers, and deviceId are required"
      );
    }

    // Find the mock MCQ set
    const mockSet = await MockMCQModel.findById(mockQSetId);
    if (!mockSet) {
      res.status(404);
      throw new Error("Mock MCQ set not found");
    }

    // Verify student has access to the course
    const passkey = await PasskeyModel.findOne({
      studentId: student?._id,
      courseId: mockSet.courseId,
      status: { $in: [PasskeyStatus.ACTIVE, PasskeyStatus.FULLY_ACTIVE] },
      expiresAt: { $gt: new Date() },
    });

    if (!passkey) {
      res.status(403);
      throw new Error("Access denied to this course");
    }

    let score = 0;
    const processedAnswers = answers.map((answer) => {
      const question = mockSet.mcqs.find(
        (mcq) => mcq._id?.toString() === answer.questionId
      );

      if (!question) {
        throw new Error(`Question ${answer.questionId} not found`);
      }

      const isCorrect = question.correctOption === answer.selectedOption;
      if (isCorrect) score++;

      return {
        questionId: answer.questionId,
        selectedOption: answer.selectedOption,
        correctOption: question.correctOption, // ✅ Add missing field
        isCorrect,
        timeTaken: answer.timeTaken || 0,
      };
    });

    // Create submission with all required fields
    const submission = await SubmissionModel.create({
      studentId: student?._id,
      passkeyId: passkey.passkeyId,
      deviceId,
      instituteId: mockSet.instituteId,
      courseId: mockSet.courseId,
      subjectId: mockSet.subjectId,
      type: "MQ",
      questionSetId: mockQSetId,
      answers: processedAnswers,
      score,
      totalQuestions: mockSet.mcqs.length,
    });

    res.status(201).json({
      success: true,
      message: "Mock MCQ submission recorded successfully",
      data: {
        submissionId: submission._id,
        score,
        totalQuestions: mockSet.mcqs.length,
        percentage: Math.round((score / mockSet.mcqs.length) * 100),
      },
    });
  }
);
// @desc    Submit published MCQ answers
// @route   POST /api/v2/courseAccess/submit/published
// @access  Private (Student)
export const submitPublishedMCQ = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { publishQSetId, answers, deviceId } = req.body as {
      publishQSetId: string;
      answers: AnswerSubmission[];
      deviceId: string;
    };
    const student = req.studentUser;

    if (!publishQSetId || !answers || !Array.isArray(answers) || !deviceId) {
      res.status(400);
      throw new Error(
        "Published question set ID, answers, and deviceId are required"
      );
    }

    // Find the published MCQ set
    const publishedSet = await PublishedMock.findById(publishQSetId);
    if (!publishedSet) {
      res.status(404);
      throw new Error("Published MCQ set not found");
    }

    // Add passkey validation (was missing - no access control!)
    const passkey = await PasskeyModel.findOne({
      studentId: student?._id,
      courseId: publishedSet.courseId,
      status: { $in: [PasskeyStatus.ACTIVE, PasskeyStatus.FULLY_ACTIVE] },
      expiresAt: { $gt: new Date() },
    });

    if (!passkey) {
      res.status(403);
      throw new Error("Access denied to this course");
    }

    let score = 0;
    const processedAnswers = answers.map((answer) => {
      const question = publishedSet.mcqs.find(
        (mcq) => mcq._id?.toString() === answer.questionId
      );

      if (!question) {
        throw new Error(`Question ${answer.questionId} not found`);
      }

      const isCorrect = question.correctOption === answer.selectedOption;
      if (isCorrect) score++;

      return {
        questionId: answer.questionId,
        selectedOption: answer.selectedOption,
        correctOption: question.correctOption,
        isCorrect,
        timeTaken: answer.timeTaken || 0,
      };
    });

    // Create submission with all required fields
    const submission = await SubmissionModel.create({
      studentId: student?._id,
      passkeyId: passkey.passkeyId,
      deviceId,
      instituteId: publishedSet.instituteId,
      courseId: publishedSet.courseId,
      subjectId: publishedSet.subjectId,
      type: "PQ",
      questionSetId: publishQSetId,
      answers: processedAnswers,
      score,
      totalQuestions: publishedSet.mcqs.length,
    });

    res.status(201).json({
      success: true,
      message: "Published MCQ submission recorded successfully",
      data: {
        submissionId: submission._id,
        score,
        totalQuestions: publishedSet.mcqs.length,
        percentage: Math.round((score / publishedSet.mcqs.length) * 100),
      },
    });
  }
);

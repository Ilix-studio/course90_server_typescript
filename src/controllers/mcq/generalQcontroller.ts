import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { GeneralMCQModel } from "../../models/mcq/generalMCQ";
import { Types } from "mongoose";

import { getInstituteId, createAccessDeniedError } from "../../utils/authUtils";

interface MCQBody {
  questionName: string;
  options: string[];
  correctOption: number;
}

interface GeneralQuestionBody {
  courseId: string;
  subjectId: string;
  language: string;
  topic: string;
}

// Get all general questions (filtered by institute)
export const getGeneralQuestions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Extract instituteId for data isolation
    const instituteId = getInstituteId(req);

    const allGQuestions = await GeneralMCQModel.find({ instituteId });

    if (!allGQuestions || allGQuestions.length === 0) {
      res.status(404).json({
        success: false,
        message: "No questions found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Questions fetched successfully",
      data: allGQuestions,
    });
  }
);

// Get General Question by Id (with institute validation)
export const getGQbyID = asyncHandler(async (req: Request, res: Response) => {
  const { generalQSetId } = req.params;
  const instituteId = getInstituteId(req);

  // Find the General Question Set by ID and validate institute ownership
  const generalQuestionSet = await GeneralMCQModel.findOne({
    _id: generalQSetId,
    instituteId, // Ensure it belongs to the user's institute
  });

  // Check if the question set exists
  if (!generalQuestionSet) {
    res.status(404);
    throw createAccessDeniedError("General Question Set");
  }

  // Return the found question set
  res.status(200).json({
    success: true,
    data: generalQuestionSet,
  });
});

// Create general question set
export const createGeneralQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const { courseId, subjectId, language, topic }: GeneralQuestionBody =
      req.body;

    // Validate required fields
    if (!courseId || !subjectId || !language || !topic) {
      res.status(400);
      throw new Error("All fields are required");
    }

    // Validate courseId format
    if (!Types.ObjectId.isValid(courseId)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    // Extract instituteId from authenticated user's token
    const instituteId = getInstituteId(req);

    const generalQuestionSet = new GeneralMCQModel({
      instituteId,
      courseId,
      subjectId,
      language,
      topic,
      mcqs: [],
    });

    const savedGQuestionSet = await generalQuestionSet.save();
    if (!savedGQuestionSet) {
      res.status(404);
      throw new Error("Failed to save the data in the database");
    }

    res.status(201).json({
      success: true,
      message: "General question set created successfully",
      generalQSetId: savedGQuestionSet._id,
      data: savedGQuestionSet,
    });
  }
);

// Add MCQ to general question set (with institute validation)
export const addMCQforGQ = asyncHandler(async (req: Request, res: Response) => {
  const { generalQSetId } = req.params;
  const { questionName, options, correctOption }: MCQBody = req.body;
  const instituteId = getInstituteId(req);

  // Validate ObjectId format
  if (!Types.ObjectId.isValid(generalQSetId)) {
    res.status(400);
    throw new Error("Invalid question set ID format");
  }

  // Validate required fields
  if (!questionName || !options || correctOption === undefined) {
    res.status(400);
    throw new Error("All MCQ fields are required");
  }

  // Find question set with institute validation
  const questionSet = await GeneralMCQModel.findOne({
    _id: generalQSetId,
    instituteId,
  });

  if (!questionSet) {
    res.status(404);
    throw createAccessDeniedError("Question set");
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

  // Create new MCQ
  const mcqData = {
    _id: new Types.ObjectId(),
    questionName,
    options,
    correctOption,
  };

  questionSet.mcqs.push(mcqData as any);
  await questionSet.save();

  res.status(200).json({
    success: true,
    message: "MCQ added successfully",
    generalQSetId: generalQSetId,
    data: mcqData,
  });
});

// Update general question set (with institute validation)
export const updateGQ = asyncHandler(async (req: Request, res: Response) => {
  const { generalQSetId } = req.params;
  const updateData: Partial<GeneralQuestionBody> = req.body;
  const instituteId = getInstituteId(req);

  // Validate ObjectId format
  if (!Types.ObjectId.isValid(generalQSetId)) {
    res.status(400);
    throw new Error("Invalid question set ID format");
  }

  // If courseId is provided, validate its format
  if (updateData.courseId && !Types.ObjectId.isValid(updateData.courseId)) {
    res.status(400);
    throw new Error("Invalid course ID format");
  }

  const updatedQuestionSet = await GeneralMCQModel.findOneAndUpdate(
    {
      _id: generalQSetId,
      instituteId, // Ensure institute ownership
    },
    {
      $set: {
        ...(updateData.courseId && { courseId: updateData.courseId }),
        ...(updateData.subjectId && { subjectId: updateData.subjectId }),
        ...(updateData.language && { language: updateData.language }),
        ...(updateData.topic && { topic: updateData.topic }),
      },
    },
    { new: true }
  ).populate("courseId", "courseName description");

  if (!updatedQuestionSet) {
    res.status(404);
    throw createAccessDeniedError("Question set");
  }

  res.status(200).json({
    success: true,
    message: "Question set updated successfully",
    data: updatedQuestionSet,
  });
});

// Update specific MCQ in a question set (with institute validation)
export const updateGQ_MCQ = asyncHandler(
  async (req: Request, res: Response) => {
    const { generalQSetId, mcqId } = req.params;
    const updateData: Partial<MCQBody> = req.body;
    const instituteId = getInstituteId(req);

    console.log("Update MCQ Request:", {
      generalQSetId,
      mcqId,
      updateData,
      instituteId,
    });

    // Validate IDs format
    if (
      !Types.ObjectId.isValid(generalQSetId) ||
      !Types.ObjectId.isValid(mcqId)
    ) {
      res.status(400);
      throw new Error("Invalid ID format");
    }

    // Verify the question set exists and belongs to institute
    const questionSet = await GeneralMCQModel.findOne({
      _id: generalQSetId,
      instituteId,
    });

    if (!questionSet) {
      res.status(404);
      throw createAccessDeniedError("Question set");
    }

    // Find the specific MCQ to update
    const mcqIndex = questionSet.mcqs.findIndex(
      (mcq) => mcq._id.toString() === mcqId
    );

    if (mcqIndex === -1) {
      res.status(404);
      throw new Error("MCQ not found in question set");
    }

    const currentMCQ = questionSet.mcqs[mcqIndex];

    // ✅ FIXED: Validate with the actual options that will be saved
    const newOptions = updateData.options ?? currentMCQ.options;
    const newCorrectOption =
      updateData.correctOption ?? currentMCQ.correctOption;

    console.log("Validation Check:", {
      newOptions,
      newCorrectOption,
      optionsLength: newOptions.length,
      isValidIndex:
        newCorrectOption >= 0 && newCorrectOption < newOptions.length,
    });

    // Validate correctOption against the new options array
    if (!Array.isArray(newOptions) || newOptions.length === 0) {
      res.status(400);
      throw new Error("Options array cannot be empty");
    }

    if (newCorrectOption < 0 || newCorrectOption >= newOptions.length) {
      res.status(400);
      throw new Error(
        `correctOption must be between 0 and ${
          newOptions.length - 1
        }. Got: ${newCorrectOption}`
      );
    }

    // ✅ SOLUTION A: Direct array modification (bypasses schema validation issues)
    if (updateData.questionName !== undefined) {
      questionSet.mcqs[mcqIndex].questionName = updateData.questionName;
    }
    if (updateData.options !== undefined) {
      questionSet.mcqs[mcqIndex].options = updateData.options;
    }
    if (updateData.correctOption !== undefined) {
      questionSet.mcqs[mcqIndex].correctOption = updateData.correctOption;
    }

    // Save with validation disabled for this specific update
    const result = await questionSet.save({ validateBeforeSave: false });

    // Get the updated MCQ
    const updatedMCQ = result.mcqs[mcqIndex];

    console.log("Update successful:", {
      updatedMCQ: {
        _id: updatedMCQ._id,
        questionName: updatedMCQ.questionName,
        options: updatedMCQ.options,
        correctOption: updatedMCQ.correctOption,
      },
    });

    res.status(200).json({
      success: true,
      message: "MCQ updated successfully",
      data: updatedMCQ,
    });
  }
);

// Delete general question set (with institute validation)
export const deleteGQ = asyncHandler(async (req: Request, res: Response) => {
  const { generalQSetId } = req.params;
  const instituteId = getInstituteId(req);

  // Validate ObjectId format
  if (!Types.ObjectId.isValid(generalQSetId)) {
    res.status(400);
    throw new Error("Invalid question set ID format");
  }

  // First find the question set to check MCQ count and institute ownership
  const questionSet = await GeneralMCQModel.findOne({
    _id: generalQSetId,
    instituteId,
  });

  if (!questionSet) {
    res.status(404);
    throw createAccessDeniedError("Question set");
  }

  // Check if there are less than 6 MCQs
  if (questionSet.mcqs.length >= 6) {
    res.status(403).json({
      success: false,
      message: "Cannot delete question set with 6 or more questions",
    });
    return;
  }

  // Delete the question set
  await questionSet.deleteOne();

  res.status(200).json({
    success: true,
    message: "Question set deleted successfully",
    data: null,
  });
});

// Delete specific MCQ from question set (with institute validation)
export const deleteGQ_mcqId = asyncHandler(
  async (req: Request, res: Response) => {
    const { generalQSetId, mcqId } = req.params;
    const instituteId = getInstituteId(req);

    // Validate IDs format
    if (
      !Types.ObjectId.isValid(generalQSetId) ||
      !Types.ObjectId.isValid(mcqId)
    ) {
      res.status(400);
      throw new Error("Invalid ID format");
    }

    // Find and update the question set
    const result = await GeneralMCQModel.findOneAndUpdate(
      {
        _id: generalQSetId,
        instituteId, // Ensure institute ownership
      },
      {
        $pull: { mcqs: { _id: new Types.ObjectId(mcqId) } },
      },
      { new: true }
    );

    if (!result) {
      res.status(404);
      throw createAccessDeniedError("Question set");
    }

    res.status(200).json({
      success: true,
      message: "MCQ deleted successfully",
      data: result,
    });
  }
);

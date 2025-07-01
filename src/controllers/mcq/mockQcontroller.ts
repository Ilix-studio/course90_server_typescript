// mockQController.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { MockMCQModel } from "../../models/mcq/mockMCQ";
import { Types } from "mongoose";
import { getInstituteId, createAccessDeniedError } from "../../utils/authUtils";

interface MCQBody {
  questionName: string;
  options: string[];
  correctOption: number;
  performanceData?: PerformanceData;
}

interface MockQuestionBody {
  courseId: string;
  subjectId: string;
  language: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  negativeMarking?: boolean;
}

interface PerformanceData {
  timeTaken?: number;
  attempts?: number;
  marks?: number;
}

// Get all mock questions (filtered by institute)
export const getMockQuestions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const instituteId = getInstituteId(req);

    const allMQuestions = await MockMCQModel.find({ instituteId });

    if (!allMQuestions || allMQuestions.length === 0) {
      res.status(404).json({
        success: false,
        message: "No questions found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Mock questions fetched successfully",
      data: allMQuestions,
    });
  }
);

// Get Mock Question by Id (with institute validation)
export const getMQbyID = asyncHandler(async (req: Request, res: Response) => {
  const { mockQSetId } = req.params;
  const instituteId = getInstituteId(req);

  // Find the Mock Question Set by ID and validate institute ownership
  const mockQuestionSet = await MockMCQModel.findOne({
    _id: mockQSetId,
    instituteId,
  });

  if (!mockQuestionSet) {
    res.status(404);
    throw createAccessDeniedError("Mock Question Set");
  }

  res.status(200).json({
    success: true,
    data: mockQuestionSet,
  });
});

// Create mock question set
export const createMockQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      courseId,
      subjectId,
      language,
      duration,
      totalMarks,
      passingMarks,
      negativeMarking = false,
    }: MockQuestionBody = req.body;

    // Validate required fields
    if (
      !courseId ||
      !subjectId ||
      !language ||
      !totalMarks ||
      !passingMarks ||
      !duration
    ) {
      res.status(400);
      throw new Error("All fields are required");
    }

    // Validate marks
    if (totalMarks <= passingMarks) {
      res.status(400);
      throw new Error("Total marks must be greater than passing marks");
    }

    // Validate courseId format
    if (!Types.ObjectId.isValid(courseId)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    // Validate subjectId format
    if (!Types.ObjectId.isValid(subjectId)) {
      res.status(400);
      throw new Error("Invalid subject ID format");
    }

    // Extract instituteId from authenticated user's token
    const instituteId = getInstituteId(req);

    const mockQuestionSet = new MockMCQModel({
      instituteId,
      courseId,
      subjectId,
      language,
      totalMarks,
      duration,
      passingMarks,
      negativeMarking,
      mcqs: [],
    });

    const savedMQuestionSet = await mockQuestionSet.save();
    if (!savedMQuestionSet) {
      res.status(404);
      throw new Error("Failed to save the data in the database");
    }

    res.status(201).json({
      success: true,
      message: "Mock question set created successfully",
      mockQSetId: savedMQuestionSet._id,
      data: savedMQuestionSet,
    });
  }
);

// Add MCQ to mock question set (with institute validation)
export const addMCQforMQ = asyncHandler(async (req: Request, res: Response) => {
  const { mockQSetId } = req.params;
  const { questionName, options, correctOption }: MCQBody = req.body;
  const instituteId = getInstituteId(req);

  // Validate ObjectId
  if (!Types.ObjectId.isValid(mockQSetId)) {
    res.status(400);
    throw new Error("Invalid question set ID format");
  }

  // Validate required fields
  if (!questionName || !options || correctOption === undefined) {
    res.status(400);
    throw new Error("Question name, options, and correct option are required");
  }

  // Validate options and correctOption
  if (
    !Array.isArray(options) ||
    options.length < 2 ||
    correctOption < 0 ||
    correctOption >= options.length
  ) {
    res.status(400);
    throw new Error("Invalid options or correct option");
  }

  // Find question set with institute validation
  const questionSet = await MockMCQModel.findOne({
    _id: mockQSetId,
    instituteId,
  });

  if (!questionSet) {
    res.status(404);
    throw createAccessDeniedError("Mock question set");
  }

  // Create new MCQ with performance data
  const newMCQ = {
    _id: new Types.ObjectId(),
    questionName,
    options,
    correctOption,
  };

  questionSet.mcqs.push(newMCQ as any);
  await questionSet.save();

  res.status(201).json({
    success: true,
    message: "MCQ added to mock set successfully",
    data: newMCQ,
  });
});

// Update mock question set metadata (with institute validation)
export const updateMQ = asyncHandler(async (req: Request, res: Response) => {
  const { mockQSetId } = req.params;
  const updateData: Partial<MockQuestionBody> = req.body;
  const instituteId = getInstituteId(req);

  // Validate ID format
  if (!Types.ObjectId.isValid(mockQSetId)) {
    res.status(400);
    throw new Error("Invalid question set ID format");
  }

  // Find current set with institute validation
  const currentSet = await MockMCQModel.findOne({
    _id: mockQSetId,
    instituteId,
  });

  if (!currentSet) {
    res.status(404);
    throw createAccessDeniedError("Mock question set");
  }

  // Validate marks if provided
  if (
    updateData.totalMarks !== undefined ||
    updateData.passingMarks !== undefined
  ) {
    const newTotal = updateData.totalMarks ?? currentSet.totalMarks;
    const newPassing = updateData.passingMarks ?? currentSet.passingMarks;

    if (newTotal <= newPassing) {
      res.status(400);
      throw new Error("Total marks must be greater than passing marks");
    }
  }

  // Validate courseId format if provided
  if (updateData.courseId && !Types.ObjectId.isValid(updateData.courseId)) {
    res.status(400);
    throw new Error("Invalid course ID format");
  }

  // Validate subjectId format if provided
  if (updateData.subjectId && !Types.ObjectId.isValid(updateData.subjectId)) {
    res.status(400);
    throw new Error("Invalid subject ID format");
  }

  const updatedQuestionSet = await MockMCQModel.findOneAndUpdate(
    {
      _id: mockQSetId,
      instituteId, // Ensure institute ownership
    },
    {
      $set: {
        ...(updateData.courseId && { courseId: updateData.courseId }),
        ...(updateData.subjectId && { subjectId: updateData.subjectId }),
        ...(updateData.language && { language: updateData.language }),
        ...(updateData.duration && { duration: updateData.duration }),
        ...(updateData.totalMarks && { totalMarks: updateData.totalMarks }),
        ...(updateData.passingMarks && {
          passingMarks: updateData.passingMarks,
        }),
        ...(updateData.negativeMarking !== undefined && {
          negativeMarking: updateData.negativeMarking,
        }),
      },
    },
    { new: true }
  )
    .populate("courseId", "name")
    .populate("subjectId", "name");

  if (!updatedQuestionSet) {
    res.status(404);
    throw createAccessDeniedError("Mock question set");
  }

  res.status(200).json({
    success: true,
    message: "Mock question set updated successfully",
    data: updatedQuestionSet,
  });
});

// Update specific MCQ in a mock question set (with institute validation)
export const updateMQ_MCQ = asyncHandler(
  async (req: Request, res: Response) => {
    const { mockQSetId, mcqId } = req.params;
    const updateData: Partial<MCQBody> = req.body;
    const instituteId = getInstituteId(req);

    // Validate IDs format
    if (!Types.ObjectId.isValid(mockQSetId) || !Types.ObjectId.isValid(mcqId)) {
      res.status(400);
      throw new Error("Invalid ID format");
    }

    // ✅ ADD: Manual validation for options and correctOption
    if (updateData.options && updateData.correctOption !== undefined) {
      if (
        updateData.correctOption < 0 ||
        updateData.correctOption >= updateData.options.length
      ) {
        res.status(400);
        throw new Error(
          `correctOption (${updateData.correctOption}) must be between 0 and ${
            updateData.options.length - 1
          }`
        );
      }
    }

    // Verify the question set exists and belongs to institute
    const questionSet = await MockMCQModel.findOne({
      _id: mockQSetId,
      instituteId,
    });

    if (!questionSet) {
      res.status(404);
      throw createAccessDeniedError("Mock question set");
    }

    // Find the specific MCQ to update
    const currentMCQ = questionSet.mcqs.find(
      (mcq) => mcq._id.toString() === mcqId
    );
    if (!currentMCQ) {
      res.status(404);
      throw new Error("MCQ not found in question set");
    }

    // Calculate new values for validation
    const newOptions = updateData.options ?? currentMCQ.options;
    const newCorrectOption =
      updateData.correctOption ?? currentMCQ.correctOption;

    // Validate correctOption against the (potentially updated) options array
    if (newCorrectOption < 0 || newCorrectOption >= newOptions.length) {
      res.status(400);
      throw new Error(
        "correctOption must be a valid index of the options array"
      );
    }

    // Build update object
    const updateFields: any = {};
    if (updateData.questionName !== undefined) {
      updateFields["mcqs.$.questionName"] = updateData.questionName;
    }
    if (updateData.options !== undefined) {
      updateFields["mcqs.$.options"] = updateData.options;
    }
    if (updateData.correctOption !== undefined) {
      updateFields["mcqs.$.correctOption"] = updateData.correctOption;
    }
    if (updateData.performanceData !== undefined) {
      updateFields["mcqs.$.performanceData"] = updateData.performanceData;
    }

    // Update the MCQ with institute validation
    const result = await MockMCQModel.findOneAndUpdate(
      {
        _id: mockQSetId,
        instituteId, // Ensure institute ownership
        "mcqs._id": new Types.ObjectId(mcqId),
      },
      { $set: updateFields },
      {
        new: true,
        runValidators: false, // ✅ FIXED: Disable validators to avoid schema validation issues
      }
    );

    if (!result) {
      res.status(404);
      throw createAccessDeniedError("MCQ");
    }

    const updatedMCQ = result.mcqs.find((mcq) => mcq._id.toString() === mcqId);
    res.status(200).json({
      success: true,
      message: "MCQ updated successfully",
      data: updatedMCQ,
    });
  }
);

// Delete mock question set (with institute validation)
export const deleteMQ = asyncHandler(async (req: Request, res: Response) => {
  const { mockQSetId } = req.params;
  const instituteId = getInstituteId(req);

  // Validate ObjectId format
  if (!Types.ObjectId.isValid(mockQSetId)) {
    res.status(400);
    throw new Error("Invalid question set ID format");
  }

  // Find the question set with institute validation
  const questionSet = await MockMCQModel.findOne({
    _id: mockQSetId,
    instituteId,
  });

  if (!questionSet) {
    res.status(404);
    throw createAccessDeniedError("Mock question set");
  }

  // Delete the question set
  await questionSet.deleteOne();

  res.status(200).json({
    success: true,
    message: "Mock question set deleted successfully",
    data: null,
  });
});

// Delete specific MCQ from mock question set (with institute validation)
export const deleteMQ_mcqId = asyncHandler(
  async (req: Request, res: Response) => {
    const { mockQSetId, mcqId } = req.params;
    const instituteId = getInstituteId(req);

    // Validate IDs format
    if (!Types.ObjectId.isValid(mockQSetId) || !Types.ObjectId.isValid(mcqId)) {
      res.status(400);
      throw new Error("Invalid ID format");
    }

    // Find and update the question set
    const result = await MockMCQModel.findOneAndUpdate(
      {
        _id: mockQSetId,
        instituteId, // Ensure institute ownership
      },
      {
        $pull: { mcqs: { _id: new Types.ObjectId(mcqId) } },
      },
      { new: true }
    );

    if (!result) {
      res.status(404);
      throw createAccessDeniedError("Mock question set");
    }

    res.status(200).json({
      success: true,
      message: "MCQ deleted successfully",
      data: result,
    });
  }
);

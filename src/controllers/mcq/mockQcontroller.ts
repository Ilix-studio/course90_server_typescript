// mockQController.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { MockMCQModel } from "../../models/mcq/mockMCQ";
import { Types } from "mongoose";

interface PerformanceData {
  timeTaken?: number;
  attempts?: number;
  marks?: number;
}

interface MCQBody {
  questionName: string;
  options: string[];
  correctOption: number;
  performanceData?: PerformanceData;
}

interface MockQuestionBody {
  subject: string;
  language: string;
  totalMarks: number;
  passingMarks: number;
  courseId: string;
}

// Get all mock questions
export const getMockQuestions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const allQuestions = await MockMCQModel.find({}).populate(
      "courseId",
      "courseName description"
    );

    res.status(200).json({
      success: true,
      message: "Mock questions fetched successfully",
      data: allQuestions,
    });
  }
);

// Create mock question set
export const createMockQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      subject,
      language,
      totalMarks,
      passingMarks,
      courseId,
    }: MockQuestionBody = req.body;

    // Validate required fields
    if (!subject || !language || !totalMarks || !passingMarks || !courseId) {
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

    const mockQuestionSet = new MockMCQModel({
      subject,
      language,
      totalMarks,
      passingMarks,
      courseId,
      mcqs: [],
    });

    const savedQuestionSet = await mockQuestionSet.save();

    res.status(201).json({
      success: true,
      message: "Mock question set created successfully",
      data: savedQuestionSet,
    });
  }
);

// Add MCQ to mock question set
export const addMCQforMQ = asyncHandler(async (req: Request, res: Response) => {
  const { mockQSetId } = req.params;
  const { questionName, options, correctOption, performanceData }: MCQBody =
    req.body;

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

  const questionSet = await MockMCQModel.findById(mockQSetId);
  if (!questionSet) {
    res.status(404);
    throw new Error("Mock question set not found");
  }

  // Create new MCQ with performance data
  const newMCQ = {
    _id: new Types.ObjectId(),
    questionName,
    options,
    correctOption,
    ...(performanceData && { performanceData }),
  };

  questionSet.mcqs.push(newMCQ as any);
  await questionSet.save();

  res.status(201).json({
    success: true,
    message: "MCQ added to mock set successfully",
    data: newMCQ,
  });
});

// Update mock question set metadata
export const updateMQ = asyncHandler(async (req: Request, res: Response) => {
  const { mockQSetId } = req.params;
  const updateData: Partial<MockQuestionBody> = req.body;

  // Validate ID format
  if (!Types.ObjectId.isValid(mockQSetId)) {
    res.status(400);
    throw new Error("Invalid question set ID format");
  }

  // Validate marks if provided
  if (
    updateData.totalMarks !== undefined ||
    updateData.passingMarks !== undefined
  ) {
    const currentSet = await MockMCQModel.findById(mockQSetId);
    if (!currentSet) {
      res.status(404);
      throw new Error("Mock question set not found");
    }

    const newTotal = updateData.totalMarks ?? currentSet.totalMarks;
    const newPassing = updateData.passingMarks ?? currentSet.passingMarks;

    if (newTotal <= newPassing) {
      res.status(400);
      throw new Error("Total marks must be greater than passing marks");
    }
  }

  const updatedSet = await MockMCQModel.findByIdAndUpdate(
    mockQSetId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate("courseId", "courseName description");

  if (!updatedSet) {
    res.status(404);
    throw new Error("Mock question set not found");
  }

  res.status(200).json({
    success: true,
    message: "Mock question set updated successfully",
    data: updatedSet,
  });
});

// Update specific MCQ in mock question set
// Update specific MCQ in mock question set
export const updateMQ_MCQ = asyncHandler(
  async (req: Request, res: Response) => {
    const { mockQSetId, mcqId } = req.params;
    const updateData: Partial<MCQBody> = req.body;

    // Validate IDs
    if (
      !Types.ObjectId.isValid(mockQSetId) ||
      (mcqId && !Types.ObjectId.isValid(mcqId as string))
    ) {
      res.status(400);
      throw new Error("Invalid ID format");
    }

    // Find the question set
    const questionSet = await MockMCQModel.findById(mockQSetId);
    if (!questionSet) {
      res.status(404);
      throw new Error("Mock question set not found");
    }

    // Find the target MCQ with proper typing
    const targetMCQ = questionSet.mcqs.find(
      (mcq) => (mcq._id as Types.ObjectId).toString() === mcqId
    );

    if (!targetMCQ) {
      res.status(404);
      throw new Error("MCQ not found in the question set");
    }

    // Validate correctOption against potential new options
    const newOptions = updateData.options ?? targetMCQ.options;
    const newCorrectOption =
      updateData.correctOption ?? targetMCQ.correctOption;

    if (newCorrectOption < 0 || newCorrectOption >= newOptions.length) {
      res.status(400);
      throw new Error(
        "correctOption must be a valid index of the options array"
      );
    }

    // Build update object
    const updateFields: Record<string, any> = {};
    const fields = ["questionName", "options", "correctOption"] as const;

    fields.forEach((field) => {
      if (updateData[field] !== undefined) {
        updateFields[`mcqs.$.${field}`] = updateData[field];
      }
    });

    // Handle performance data updates
    if (updateData.performanceData) {
      Object.entries(updateData.performanceData).forEach(([key, value]) => {
        updateFields[`mcqs.$.performanceData.${key}`] = value;
      });
    }

    // Perform the update with proper ObjectId casting
    const updatedSet = await MockMCQModel.findOneAndUpdate(
      {
        _id: mockQSetId,
        "mcqs._id": new Types.ObjectId(mcqId as string),
      },
      { $set: updateFields },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedSet) {
      res.status(404);
      throw new Error("Update failed - question set or MCQ not found");
    }

    // Find updated MCQ with proper typing
    const updatedMCQ = updatedSet.mcqs.find(
      (mcq) => (mcq._id as Types.ObjectId).toString() === mcqId
    );

    res.status(200).json({
      success: true,
      message: "MCQ updated successfully",
      data: updatedMCQ,
    });
  }
);

// Delete mock question set
export const deleteMQ = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid question set ID format");
  }

  const deletedSet = await MockMCQModel.findByIdAndDelete(id);

  if (!deletedSet) {
    res.status(404);
    throw new Error("Mock question set not found");
  }

  res.status(200).json({
    success: true,
    message: "Mock question set deleted successfully",
    data: null,
  });
});

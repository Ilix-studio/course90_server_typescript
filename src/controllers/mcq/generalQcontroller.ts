import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { GeneralMCQModel } from "../../models/mcq/generalMCQ";
import { Types } from "mongoose";

interface MCQBody {
  questionName: string;
  options: string[];
  correctOption: number;
}

interface GeneralQuestionBody {
  courseId: string;
  subject: string;
  language: string;
  topic: string;
}

// Get all general questions
export const getGeneralQuestions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const allGQuestions = await GeneralMCQModel.find({});

    if (!allGQuestions || allGQuestions.length === 0) {
      res.status(404).json({
        success: false,
        message: "No questions found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Questions fetched successfully",
      data: allGQuestions,
    });
  }
);

// Create general question set
export const createGeneralQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const { courseId, subject, language, topic }: GeneralQuestionBody =
      req.body;

    // Validate required fields
    if (!courseId || !subject || !language || !topic) {
      res.status(400);
      throw new Error("All fields are required");
    }

    // Validate courseId format
    if (!Types.ObjectId.isValid(courseId)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    const generalQuestionSet = new GeneralMCQModel({
      course: courseId,
      subject,
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

// Add MCQ to general question set
export const addMCQforGQ = asyncHandler(async (req: Request, res: Response) => {
  const { generalQSetId } = req.params;
  const { questionName, options, correctOption }: MCQBody = req.body;

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

  const questionSet = await GeneralMCQModel.findById(generalQSetId);

  if (!questionSet) {
    res.status(404);
    throw new Error("Question set not found");
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

// Update general question set
export const updateGQ = asyncHandler(async (req: Request, res: Response) => {
  const { generalQSetId } = req.params;
  const updateData: Partial<GeneralQuestionBody> = req.body;

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

  const updatedQuestionSet = await GeneralMCQModel.findByIdAndUpdate(
    generalQSetId,
    {
      $set: {
        ...(updateData.courseId && { course: updateData.courseId }),
        ...(updateData.subject && { subject: updateData.subject }),
        ...(updateData.language && { language: updateData.language }),
        ...(updateData.topic && { topic: updateData.topic }),
      },
    },
    { new: true }
  ).populate("course", "courseName description");

  if (!updatedQuestionSet) {
    res.status(404);
    throw new Error("Question set not found");
  }

  res.status(200).json({
    success: true,
    message: "Question set updated successfully",
    data: updatedQuestionSet,
  });
});

// Update specific MCQ in a question set
export const updateGQ_MCQ = asyncHandler(
  async (req: Request, res: Response) => {
    const { generalQSetId, mcqId } = req.params;
    const updateData: Partial<MCQBody> = req.body;

    // Validate IDs format
    if (
      !Types.ObjectId.isValid(generalQSetId) ||
      !Types.ObjectId.isValid(mcqId)
    ) {
      res.status(400);
      throw new Error("Invalid ID format");
    }

    // Verify the question set exists
    const questionSet = await GeneralMCQModel.findById(generalQSetId);
    if (!questionSet) {
      res.status(404);
      throw new Error("Question set not found");
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

    // Update the MCQ
    const result = await GeneralMCQModel.findOneAndUpdate(
      {
        _id: generalQSetId,
        "mcqs._id": new Types.ObjectId(mcqId),
      },
      { $set: updateFields },
      {
        new: true,
        runValidators: true, // Still run schema validators as backup
      }
    );

    if (!result) {
      res.status(404);
      throw new Error("Failed to update MCQ");
    }

    const updatedMCQ = result.mcqs.find((mcq) => mcq._id.toString() === mcqId);
    res.status(200).json({
      success: true,
      message: "MCQ updated successfully",
      data: updatedMCQ,
    });
  }
);

// Delete general question set
export const deleteGQ = asyncHandler(async (req: Request, res: Response) => {
  const { generalQSetId } = req.params;

  // Validate ObjectId format
  if (!Types.ObjectId.isValid(generalQSetId)) {
    res.status(400);
    throw new Error("Invalid question set ID format");
  }

  const deletedQuestionSet = await GeneralMCQModel.findByIdAndDelete(
    generalQSetId
  );

  if (!deletedQuestionSet) {
    res.status(404);
    throw new Error("Question set not found");
  }

  res.status(200).json({
    success: true,
    message: "Question set deleted successfully",
    data: null,
  });
});

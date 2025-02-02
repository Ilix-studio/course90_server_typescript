import { LongNoteModel } from "../../models/mcq/longNotsModel";
import { AuthenticatedRequest } from "../../types/request.types";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

interface CreateNoteRequest extends AuthenticatedRequest {
  body: {
    title: string;
    content: string;
    courseId: string;
  };
}

interface UpdateNoteRequest extends AuthenticatedRequest {
  params: {
    id: string;
  };
  body: {
    title?: string;
    content?: string;
    courseId?: string;
  };
}

interface DeleteNoteRequest extends AuthenticatedRequest {
  params: {
    id: string;
  };
}

// Get all the Notes Question
export const getNotes = asyncHandler(async (req: Request, res: Response) => {
  const notes = await LongNoteModel.find()
    .populate("course", "courseName")
    .sort({ createdAt: -1 });

  if (!notes || notes.length === 0) {
    res.status(404);
    throw new Error("No notes found");
  }

  res.status(200).json({
    success: true,
    message: "Notes fetched successfully",
    data: notes,
  });
});

// create the Notes Question
export const createNotes = asyncHandler(
  async (req: CreateNoteRequest, res: Response) => {
    const { title, content, courseId } = req.body;
    // Validate required fields
    if (!title || !content || !courseId) {
      res.status(400);
      throw new Error(
        "Please provide all required fields: title, content, and courseId"
      );
    }
    const newNote = await LongNoteModel.create({
      title,
      content,
      course: courseId,
    });

    res.status(201).json({
      success: true,
      message: "Note created successfully",
      data: newNote,
    });
  }
);

// update the Notes Question
export const updateNotes = asyncHandler(
  async (req: UpdateNoteRequest, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const note = await LongNoteModel.findById(id);

    if (!note) {
      res.status(404);
      throw new Error("Note not found");
    }

    // Update only provided fields
    const updatedNote = await LongNoteModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedNote) {
      res.status(404);
      throw new Error("Failed to update note");
    }

    res.status(200).json({
      success: true,
      message: "Note updated successfully",
      data: updatedNote,
    });
  }
);

// delete the Notes Question
export const deleteNotes = asyncHandler(
  async (req: DeleteNoteRequest, res: Response) => {
    const { id } = req.params;
    const note = await LongNoteModel.findById(id);

    if (!note) {
      res.status(404);
      throw new Error("Note not found");
    }

    await LongNoteModel.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Note deleted successfully",
      data: null,
    });
  }
);

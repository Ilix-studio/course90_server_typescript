// notesController.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { LongNoteModel } from "../../models/mcq/longNoteModel";
import { Types } from "mongoose";
import { getInstituteId, createAccessDeniedError } from "../../utils/authUtils";

interface NoteBody {
  title: string;
  content: string;
}

interface LongNotesBody {
  courseId: string;
  subjectId: string;
  language: string;
  topic: string;
}

interface NoteUpdateBody {
  // Metadata fields
  courseId?: string;
  subjectId?: string;
  language?: string;
  topic?: string;

  // Note body fields (optional)
  noteBodyId?: string;
  title?: string;
  content?: string;
}

// Get all notes (filtered by institute)
export const getNotes = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const instituteId = getInstituteId(req);

    const allNotes = await LongNoteModel.find({ instituteId })
      .populate("courseId", "name")
      .populate("subjectId", "name");

    if (!allNotes || allNotes.length === 0) {
      res.status(404).json({
        success: false,
        message: "No notes found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Notes fetched successfully",
      data: allNotes,
    });
  }
);

// Get a single note by ID (with institute validation)
export const getNoteById = asyncHandler(async (req: Request, res: Response) => {
  const { noteSetId } = req.params;
  const instituteId = getInstituteId(req);

  // Find the note and validate institute ownership
  const note = await LongNoteModel.findOne({
    _id: noteSetId,
    instituteId,
  })
    .populate("courseId", "name")
    .populate("subjectId", "name");

  if (!note) {
    res.status(404);
    throw createAccessDeniedError("Note");
  }

  res.json({
    success: true,
    data: note,
  });
});

// Create notes
export const createNotes = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, subjectId, language, topic }: LongNotesBody = req.body;

  // Validate required fields
  if (!courseId || !subjectId || !language || !topic) {
    res.status(400);
    throw new Error(
      "All required fields: courseId, subjectId, language, topic"
    );
  }

  // Validate ObjectId formats
  if (!Types.ObjectId.isValid(courseId)) {
    res.status(400);
    throw new Error("Invalid course ID format");
  }

  if (!Types.ObjectId.isValid(subjectId)) {
    res.status(400);
    throw new Error("Invalid subject ID format");
  }

  // Extract instituteId from authenticated user's token
  const instituteId = getInstituteId(req);

  const newNote = await LongNoteModel.create({
    instituteId,
    courseId,
    subjectId,
    language,
    topic,
    notebody: [],
  });

  res.status(201).json({
    success: true,
    message: "Note created successfully",
    data: newNote,
  });
});

// Update the Notes Question (with institute validation)
export const updateNotes = asyncHandler(async (req: Request, res: Response) => {
  const { noteSetId } = req.params;
  const { subjectId, language, topic }: Partial<LongNotesBody> = req.body;
  const instituteId = getInstituteId(req);

  // Validate ObjectId format
  if (!Types.ObjectId.isValid(noteSetId)) {
    res.status(400);
    throw new Error("Invalid note set ID format");
  }

  // Verify at least one field is provided for update
  if (!subjectId && !language && !topic) {
    res.status(400);
    throw new Error("Please provide at least one field to update");
  }

  // Validate subjectId format if provided
  if (subjectId && !Types.ObjectId.isValid(subjectId)) {
    res.status(400);
    throw new Error("Invalid subject ID format");
  }

  const updatedNote = await LongNoteModel.findOneAndUpdate(
    {
      _id: noteSetId,
      instituteId, // Ensure institute ownership
    },
    {
      $set: {
        ...(subjectId && { subjectId }),
        ...(language && { language }),
        ...(topic && { topic }),
      },
    },
    { new: true }
  )
    .populate("courseId", "name")
    .populate("subjectId", "name");

  if (!updatedNote) {
    res.status(404);
    throw createAccessDeniedError("Note");
  }

  res.status(200).json({
    success: true,
    message: "Note updated successfully",
    data: updatedNote,
  });
});

// Delete the Notes Question (with institute validation)
export const deleteNotes = asyncHandler(async (req: Request, res: Response) => {
  const { noteSetId } = req.params;
  const instituteId = getInstituteId(req);

  // Validate ObjectId format
  if (!Types.ObjectId.isValid(noteSetId)) {
    res.status(400);
    throw new Error("Invalid note set ID format");
  }

  // Find and delete the note with institute validation
  const note = await LongNoteModel.findOneAndDelete({
    _id: noteSetId,
    instituteId,
  });

  if (!note) {
    res.status(404);
    throw createAccessDeniedError("Note");
  }

  res.status(200).json({
    success: true,
    message: "Note deleted successfully",
    data: null,
  });
});

// Add note body to a note set (with institute validation)
export const addNotebody = asyncHandler(async (req: Request, res: Response) => {
  const { noteSetId } = req.params;
  const { title, content }: NoteBody = req.body;
  const instituteId = getInstituteId(req);

  // Validate ObjectId format
  if (!Types.ObjectId.isValid(noteSetId)) {
    res.status(400);
    throw new Error("Invalid note set ID format");
  }

  // Validate required fields
  if (!title || !content) {
    res.status(400);
    throw new Error("Title and content are required");
  }

  // Validate content length
  if (content.length > 120000) {
    res.status(400);
    throw new Error("Content exceeds maximum length (120,000 characters)");
  }

  // Find note set with institute validation
  const noteSet = await LongNoteModel.findOne({
    _id: noteSetId,
    instituteId,
  });

  if (!noteSet) {
    res.status(404);
    throw createAccessDeniedError("Note set");
  }

  // Create new note body
  const noteBodyData = {
    _id: new Types.ObjectId(),
    title,
    content,
    wordCount: content.trim().split(/\s+/).length,
  };

  noteSet.notebody.push(noteBodyData as any);
  await noteSet.save();

  res.status(200).json({
    success: true,
    message: "Note body added successfully",
    noteSetId: noteSetId,
    data: noteBodyData,
  });
});

export const updateNoteBody = asyncHandler(
  async (req: Request, res: Response) => {
    const { noteSetId } = req.params;
    const { courseId, subjectId, language, topic } = req.body;
    const instituteId = getInstituteId(req);

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(noteSetId)) {
      res.status(400);
      throw new Error("Invalid note set ID format");
    }

    // Validate at least one field is provided for update
    if (!courseId && !subjectId && !language && !topic) {
      res.status(400);
      throw new Error("Please provide at least one field to update");
    }

    // Validate courseId format if provided
    if (courseId && !Types.ObjectId.isValid(courseId)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    // Validate subjectId format if provided
    if (subjectId && !Types.ObjectId.isValid(subjectId)) {
      res.status(400);
      throw new Error("Invalid subject ID format");
    }

    // Build update object
    const updateData: any = {};
    if (courseId) updateData.courseId = courseId;
    if (subjectId) updateData.subjectId = subjectId;
    if (language) updateData.language = language;
    if (topic) updateData.topic = topic;

    const updatedNote = await LongNoteModel.findOneAndUpdate(
      {
        _id: noteSetId,
        instituteId, // Ensure institute ownership
      },
      {
        $set: updateData,
      },
      { new: true }
    )
      .populate("courseId", "name")
      .populate("subjectId", "name");

    if (!updatedNote) {
      res.status(404);
      throw createAccessDeniedError("Note set");
    }

    res.status(200).json({
      success: true,
      message: "Note set updated successfully",
      data: updatedNote,
    });
  }
);

// Update specific noteBody (with institute validation)
export const updateNote_SetId = asyncHandler(
  async (req: Request, res: Response) => {
    const { noteSetId, noteBodySetId } = req.params;
    const { title, content }: Partial<NoteBody> = req.body;
    const instituteId = getInstituteId(req);

    // Validate IDs format
    if (
      !Types.ObjectId.isValid(noteSetId) ||
      !Types.ObjectId.isValid(noteBodySetId)
    ) {
      res.status(400);
      throw new Error("Invalid ID format");
    }

    // Validate content length if provided
    if (content && content.length > 120000) {
      res.status(400);
      throw new Error("Content exceeds maximum length (120,000 characters)");
    }

    // Find note with institute validation
    const note = await LongNoteModel.findOne({
      _id: noteSetId,
      instituteId,
    });

    if (!note) {
      res.status(404);
      throw createAccessDeniedError("Note");
    }

    // Find the specific noteBody
    const noteBodyIndex = note.notebody.findIndex(
      (nb) => nb._id && nb._id.toString() === noteBodySetId
    );

    if (noteBodyIndex === -1) {
      res.status(404);
      throw new Error("Note body not found");
    }

    // Update the fields if provided
    if (title) note.notebody[noteBodyIndex].title = title;
    if (content) {
      note.notebody[noteBodyIndex].content = content;
      note.notebody[noteBodyIndex].wordCount = content
        .trim()
        .split(/\s+/).length;
    }

    const updatedNote = await note.save();
    const updatedNoteBody = updatedNote.notebody[noteBodyIndex];

    res.json({
      success: true,
      message: "Note body updated successfully",
      data: updatedNoteBody,
    });
  }
);

// Delete entire note set (with institute validation)
export const deleteNoteBody = asyncHandler(
  async (req: Request, res: Response) => {
    const { noteSetId } = req.params;
    const instituteId = getInstituteId(req);

    console.log("Delete Note Set Request:", {
      noteSetId,
      instituteId,
    });

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(noteSetId)) {
      res.status(400);
      throw new Error("Invalid note set ID format");
    }

    // Find and delete the note set with institute validation
    const deletedNote = await LongNoteModel.findOneAndDelete({
      _id: noteSetId,
      instituteId, // Ensure institute ownership
    });

    if (!deletedNote) {
      res.status(404);
      throw createAccessDeniedError("Note set");
    }

    console.log("Note set deleted successfully:", {
      deletedNoteId: deletedNote._id,
      topic: deletedNote.topic,
      noteBodyCount: deletedNote.notebody.length,
    });

    res.status(200).json({
      success: true,
      message: "Note set deleted successfully",
      data: {
        deletedNoteId: deletedNote._id,
        topic: deletedNote.topic,
        deletedAt: new Date(),
      },
    });
  }
);

// Delete specific noteBody (with institute validation)
export const deleteNoteBody_SetId = asyncHandler(
  async (req: Request, res: Response) => {
    const { noteSetId, noteBodySetId } = req.params;
    const instituteId = getInstituteId(req);

    // Validate IDs format
    if (
      !Types.ObjectId.isValid(noteSetId) ||
      !Types.ObjectId.isValid(noteBodySetId)
    ) {
      res.status(400);
      throw new Error("Invalid ID format");
    }

    // Find and update the note
    const result = await LongNoteModel.findOneAndUpdate(
      {
        _id: noteSetId,
        instituteId, // Ensure institute ownership
      },
      {
        $pull: { notebody: { _id: new Types.ObjectId(noteBodySetId) } },
      },
      { new: true }
    );

    if (!result) {
      res.status(404);
      throw createAccessDeniedError("Note");
    }

    res.json({
      success: true,
      message: "Note body deleted successfully",
      data: result,
    });
  }
);

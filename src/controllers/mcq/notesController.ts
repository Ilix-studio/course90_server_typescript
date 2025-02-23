import {
  CreateNoteRequest,
  DeleteNoteRequest,
  NoteBodyRequest,
  UpdateNoteRequest,
} from "@/types/note.types";
import { CourseModel } from "../../models/course/courseModel";
import { LongNoteModel } from "../../models/mcq/longNoteModel";
import { AuthenticatedRequest } from "../../types/request.types";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import { Types } from "mongoose";

// Get all the Notes Question
const getNotes = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const courseId = req.query.courseId;

    // Build query based on provided filters
    const query: any = {};

    if (courseId) {
      // Verify course belongs to institute
      const course = await CourseModel.findOne({
        _id: courseId,
        institute: req.institute?._id,
      });

      if (!course) {
        res.status(404);
        throw new Error(
          "Course not found or does not belong to your institute"
        );
      }

      query.course = courseId;
    } else {
      // Get all courses for this institute
      const courses = await CourseModel.find({
        institute: req.institute?._id,
      }).select("_id");

      query.course = { $in: courses.map((c) => c._id) };
    }

    // Get notes with pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // For large content, we don't send the full content in the listing
    const notes = await LongNoteModel.find(query)
      .select(
        "course subject language topic contentSummary wordCount createdAt updatedAt"
      )
      .populate("course", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await LongNoteModel.countDocuments(query);

    res.json({
      success: true,
      count: notes.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: notes,
    });
  }
);

// create the Notes Question
const createNotes = asyncHandler(
  async (req: CreateNoteRequest, res: Response) => {
    const { courseId, subject, language, topic } = req.body;

    // Validate required fields
    if (!courseId || !subject || !language || !topic) {
      res.status(400);
      throw new Error(
        "Please provide all required fields: courseId, subject, language, topic"
      );
    }

    // Verify course exists and belongs to institute
    const course = await CourseModel.findOne({
      _id: courseId,
      institute: req.institute?._id,
    });

    if (!course) {
      res.status(404);
      throw new Error("Course not found or does not belong to your institute");
    }

    const newNote = await LongNoteModel.create({
      course: courseId, // Using courseId as course reference
      subject,
      language,
      topic,
      notebody: [],
    });

    // Add note reference to the course
    await CourseModel.findByIdAndUpdate(courseId, {
      $push: { longNotes: newNote._id },
    });

    res.status(201).json({
      success: true,
      message: "Note created successfully",
      data: newNote,
    });
  }
);

// update the Notes Question
const updateNotes = asyncHandler(
  async (req: UpdateNoteRequest, res: Response) => {
    const { noteSetId } = req.params;
    const { subject, language, topic } = req.body;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(noteSetId)) {
      res.status(400);
      throw new Error("Invalid question set ID format");
    }

    // Verify at least one field is provided for update
    if (!subject && !language && !topic) {
      res.status(400);
      throw new Error("Please provide at least one field to update");
    }

    const note = await LongNoteModel.findById(noteSetId);

    if (!note) {
      res.status(404);
      throw new Error("Note not found");
    }

    // Verify that the note belongs to a course owned by this institute
    const course = await CourseModel.findOne({
      _id: note.course,
      institute: req.institute?._id,
    });

    if (!course) {
      res.status(403);
      throw new Error("You don't have permission to modify this note");
    }

    // Update note
    if (subject) note.subject = subject;
    if (language) note.language = language;
    if (topic) note.topic = topic;

    const updatedNote = await note.save();

    res.status(200).json({
      success: true,
      message: "Note updated successfully",
      data: updatedNote,
    });
  }
);

// delete the Notes Question
const deleteNotes = asyncHandler(
  async (req: DeleteNoteRequest, res: Response) => {
    const { noteSetId } = req.params;

    const note = await LongNoteModel.findById(noteSetId);

    if (!note) {
      res.status(404);
      throw new Error("Note not found");
    }

    // Verify that the note belongs to a course owned by this institute
    const course = await CourseModel.findOne({
      _id: note.course,
      institute: req.institute?._id,
    });

    if (!course) {
      res.status(403);
      throw new Error("You don't have permission to delete this note");
    }

    // Remove note reference from course
    await CourseModel.findByIdAndUpdate(note.course, {
      $pull: { longNotes: noteSetId },
    });

    // Delete note
    await note.deleteOne();

    res.json({
      success: true,
      message: "Note deleted successfully",
    });
  }
);
// || !notebody || notebody.length === 0

const addNotebody = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { noteSetId } = req.params;
    const { title, content } = req.body;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(noteSetId)) {
      res.status(400);
      throw new Error("Invalid question set ID format");
    }

    // Validate required fields
    if (!title || !content) {
      res.status(400);
      throw new Error("Please provide title and content");
    }
    // Validate content length
    if (content.length > 120000) {
      res.status(400);
      throw new Error("Content exceeds maximum length (15,000 words)");
    }

    const noteSet = await LongNoteModel.findById(noteSetId);

    if (!noteSet) {
      res.status(404);
      throw new Error("Note not found");
    }

    // Verify ownership
    const course = await CourseModel.findOne({
      _id: noteSet.course,
      institute: req.institute?._id,
    });

    if (!course) {
      res.status(403);
      throw new Error("You don't have permission to modify this note");
    }

    // Create new noteBody with its own _id
    const newNoteBody = {
      _id: new Types.ObjectId(),
      title,
      content,
    };

    // Add to notebody array
    noteSet.notebody.push(newNoteBody as any);
    await noteSet.save();

    res.status(201).json({
      success: true,
      message: "Note body added successfully",
      noteSetId: noteSetId,
      data: newNoteBody,
    });
  }
);

// const getNoteBody = asyncHandler(
//   async (req: NoteBodyRequest, res: Response) => {
//     const { noteSetId, noteBodySetId } = req.params;

//     const note = await LongNoteModel.findById(noteSetId);

//     if (!note) {
//       res.status(404);
//       throw new Error("Note not found");
//     }

//     // Verify ownership
//     const course = await CourseModel.findOne({
//       _id: note.course,
//       institute: req.institute?._id,
//     });

//     if (!course) {
//       res.status(403);
//       throw new Error("You don't have permission to access this note");
//     }

//     // Find the specific noteBody
//     const noteBody = note.notebody.find(
//       (nb) => nb._id && nb._id.toString() === noteBodySetId
//     );

//     if (!noteBody) {
//       res.status(404);
//       throw new Error("Note body not found");
//     }

//     res.json({
//       success: true,
//       data: noteBody,
//     });
//   }
// );

// Get a single note by ID
const getNoteById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { noteSetId } = req.params;

    if (!req.institute?._id) {
      res.status(401);
      throw new Error("Not authorized");
    }

    const note = await LongNoteModel.findById(noteSetId).populate({
      path: "course",
      select: "name institute",
    });

    if (!note) {
      res.status(404);
      throw new Error("Note not found");
    }

    // Type assertion for populated course
    const course = note.course as any;

    // Check if the note belongs to the institute
    if (course.institute.toString() !== req.institute._id.toString()) {
      res.status(403);
      throw new Error("You don't have permission to access this note");
    }

    res.json({
      success: true,
      data: note,
    });
  }
);

// Update specific noteBody
const updateNoteBody = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { noteSetId, noteBodySetId } = req.params;
    const { title, content } = req.body;

    if (!req.institute?._id) {
      res.status(401);
      throw new Error("Not authorized");
    }

    if (content && content.length > 120000) {
      res.status(400);
      throw new Error("Content exceeds maximum length (15,000 words)");
    }

    const note = await LongNoteModel.findById(noteSetId).populate({
      path: "course",
      select: "institute",
    });

    if (!note) {
      res.status(404);
      throw new Error("Note not found");
    }

    // Type assertion for populated course
    const course = note.course as any;

    // Check if the note belongs to the institute
    if (course.institute.toString() !== req.institute._id.toString()) {
      res.status(403);
      throw new Error("You don't have permission to modify this note");
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
    if (content) note.notebody[noteBodyIndex].content = content;

    const updatedNote = await note.save();
    const updatedNoteBody = updatedNote.notebody[noteBodyIndex];

    res.json({
      success: true,
      message: "Note body updated successfully",
      data: updatedNoteBody,
    });
  }
);

// Delete specific noteBody
const deleteNoteBody = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { noteSetId, noteBodySetId } = req.params;

    if (!req.institute?._id) {
      res.status(401);
      throw new Error("Not authorized");
    }

    const note = await LongNoteModel.findById(noteSetId).populate({
      path: "course",
      select: "institute",
    });

    if (!note) {
      res.status(404);
      throw new Error("Note not found");
    }

    // Type assertion for populated course
    const course = note.course as any;

    // Check if the note belongs to the institute
    if (course.institute.toString() !== req.institute._id.toString()) {
      res.status(403);
      throw new Error("You don't have permission to modify this note");
    }

    // Find and remove the specific noteBody
    const noteBodyIndex = note.notebody.findIndex(
      (nb) => nb._id && nb._id.toString() === noteBodySetId
    );

    if (noteBodyIndex === -1) {
      res.status(404);
      throw new Error("Note body not found");
    }

    // Remove the noteBody
    note.notebody.splice(noteBodyIndex, 1);
    await note.save();

    res.json({
      success: true,
      message: "Note body deleted successfully",
    });
  }
);

export {
  getNotes,
  getNoteById,
  createNotes,
  updateNotes,
  deleteNotes,
  addNotebody,
  updateNoteBody,
  deleteNoteBody,
};

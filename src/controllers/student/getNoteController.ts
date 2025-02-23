import { LongNoteModel } from "../../models/mcq/longNoteModel";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

export const getNotes = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;

  const notes = await LongNoteModel.find({
    course: courseId,
  });

  res.json(notes);
});

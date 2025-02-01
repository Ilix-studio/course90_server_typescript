import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

// Get all the Notes Question
export const getNotes = asyncHandler(async (req: Request, res: Response) => {});

// create the Notes Question
export const createNotes = asyncHandler(
  async (req: Request, res: Response) => {}
);

// update the Notes Question
export const updateNotes = asyncHandler(
  async (req: Request, res: Response) => {}
);

// delete the Notes Question
export const deleteNotes = asyncHandler(
  async (req: Request, res: Response) => {}
);

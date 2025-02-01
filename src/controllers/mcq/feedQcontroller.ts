import asyncHandler from "express-async-handler";
import { Request, Response } from "express";

export const publishMockTest = asyncHandler(
  async (req: Request, res: Response) => {}
);
// FOr students
export const getFeedMockTests = asyncHandler(
  async (req: Request, res: Response) => {}
);

// Get all the Feed Question
export const getFeedQuestions = asyncHandler(
  async (req: Request, res: Response) => {}
);

// create the Feed Question
export const createFeedQuestions = asyncHandler(
  async (req: Request, res: Response) => {}
);

// create the Feed Question and insert MCQ form
export const addMCQforFQ = asyncHandler(
  async (req: Request, res: Response) => {}
);

// update the Feed Question
export const updateFQ = asyncHandler(async (req: Request, res: Response) => {});

// update  MCQ form
export const updateFQ_MCQ = asyncHandler(
  async (req: Request, res: Response) => {}
);

// delete the Feed Question
export const deleteFQ = asyncHandler(async (req: Request, res: Response) => {});

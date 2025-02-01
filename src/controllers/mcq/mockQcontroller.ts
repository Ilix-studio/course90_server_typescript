import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

// Get all the Mock Question
export const getMockQuestions = asyncHandler(
  async (req: Request, res: Response) => {}
);

// create the Mock Question
export const createMockQuestions = asyncHandler(
  async (req: Request, res: Response) => {}
);

// create the Mock Question and insert MCQ form
export const addMCQforMQ = asyncHandler(
  async (req: Request, res: Response) => {}
);

// update the Mock Question
export const updateMQ = asyncHandler(async (req: Request, res: Response) => {});

// update  MCQ form
export const updateMQ_MCQ = asyncHandler(
  async (req: Request, res: Response) => {}
);

// delete the Mock Question
export const deleteMQ = asyncHandler(async (req: Request, res: Response) => {});

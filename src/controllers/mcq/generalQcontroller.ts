import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

// Get all the General Question
export const getGeneralQuestions = asyncHandler(
  async (req: Request, res: Response) => {}
);

// create Logic for the General Question
export const createGeneralQuestions = asyncHandler(
  async (req: Request, res: Response) => {}
);

// create the General Question and insert MCQ form
export const addMCQforGQ = asyncHandler(
  async (req: Request, res: Response) => {}
);

// update the General Question
export const updateGQ = asyncHandler(async (req: Request, res: Response) => {});

// update  MCQ form
export const updateGQ_MCQ = asyncHandler(
  async (req: Request, res: Response) => {}
);

// delete the General Question
export const deleteGQ = asyncHandler(async (req: Request, res: Response) => {});

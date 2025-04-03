import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

export const loginStudent = asyncHandler(
  async (req: Request, res: Response) => {}
);

export const switchAccount = asyncHandler(
  async (req: Request, res: Response) => {}
);

export const getPerformance = asyncHandler(
  async (req: Request, res: Response) => {}
);

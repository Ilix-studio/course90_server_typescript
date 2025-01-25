import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { CustomError } from "@/types/error.types";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(err.stack);

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export const routeNotFound = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error: CustomError = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

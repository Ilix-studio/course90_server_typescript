import { Request, Response, NextFunction } from "express";
import { Schema } from "joi";
import logger from "../utils/logger";

export const validateRequest = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);

    if (error) {
      logger.warn("Validation error:", error.details);
      res.status(400);
      throw new Error(error.details[0].message);
    }

    next();
  };
};

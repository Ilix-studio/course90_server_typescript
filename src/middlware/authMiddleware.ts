import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../types/request.types";
import { InstituteAuth } from "../models/auth/instituteModel";
import logger from "../utils/logger";
import asyncHandler from "express-async-handler";
import { IInstituteModel } from "../types/auth.types";

interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}
export const protectAccess = asyncHandler(
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    let token: string | undefined;

    logger.debug("Auth Header:", req.headers.authorization);

    if (req.headers.authorization?.startsWith("Bearer")) {
      try {
        token = req.headers.authorization.split(" ")[1];

        const decoded = jwt.verify(
          token,
          process.env.ACCESS_TOKEN_SECRET as string
        ) as JwtPayload;

        const institute = (await InstituteAuth.findById(decoded.id).select(
          "-password"
        )) as IInstituteModel | null;

        if (!institute) {
          res.status(401);
          throw new Error("Institute not found");
        }

        req.institute = institute;
        next();
      } catch (error) {
        logger.error("Auth Error:", error);

        if (error instanceof jwt.JsonWebTokenError) {
          res.status(401);
          throw new Error("Invalid token");
        }
        if (error instanceof jwt.TokenExpiredError) {
          res.status(401);
          throw new Error("Token expired");
        }

        res.status(401);
        throw new Error("Not authorized");
      }
    }

    if (!token) {
      res.status(401);
      throw new Error("Not authorized, no token");
    }
  }
);

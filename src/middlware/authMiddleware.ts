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

    // Log full authorization header
    logger.debug("Full Auth Header:", req.headers.authorization);

    if (req.headers.authorization?.startsWith("Bearer")) {
      try {
        // Extract and log token
        token = req.headers.authorization.split(" ")[1];
        logger.debug("Extracted Token:", token);

        // Log secret key (only in development)
        if (process.env.NODE_ENV !== "production") {
          logger.debug(
            "ACCESS_TOKEN_SECRET first 4 chars:",
            process.env.ACCESS_TOKEN_SECRET?.substring(0, 4)
          );
        }

        // Verify token exists
        if (!token) {
          res.status(401);
          throw new Error("Token extraction failed");
        }

        // Verify secret exists
        if (!process.env.ACCESS_TOKEN_SECRET) {
          res.status(500);
          throw new Error("JWT secret is not configured");
        }

        // Verify token
        const decoded = jwt.verify(
          token,
          process.env.ACCESS_TOKEN_SECRET
        ) as JwtPayload;

        logger.debug("Decoded Token:", { ...decoded, id: decoded.id });

        // Find institute
        const institute = (await InstituteAuth.findById(decoded.id).select(
          "-password"
        )) as IInstituteModel | null;

        if (!institute) {
          res.status(401);
          throw new Error("Institute not found");
        }

        // Log successful authentication
        logger.debug("Authentication successful for institute:", institute._id);

        req.institute = institute;
        next();
      } catch (error) {
        logger.error("Auth Error Details:", {
          error: error instanceof Error ? error.message : "Unknown error",
          name: error instanceof Error ? error.name : "Unknown",
          stack: error instanceof Error ? error.stack : undefined,
        });

        if (error instanceof jwt.JsonWebTokenError) {
          res.status(401);
          throw new Error(`Invalid token: ${error.message}`);
        }
        if (error instanceof jwt.TokenExpiredError) {
          res.status(401);
          throw new Error("Token expired");
        }

        res.status(401);
        throw error instanceof Error
          ? error
          : new Error("Authentication failed");
      }
    } else {
      res.status(401);
      throw new Error("No Bearer token found in Authorization header");
    }
  }
);

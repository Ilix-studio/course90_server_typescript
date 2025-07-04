import { Request, Response, NextFunction } from "express";
import { StudentModel } from "../models/auth/studentModel";
import { IStudentDocument } from "../types/studentAuth.types";
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";

// Extend Express Request to include student user
declare global {
  namespace Express {
    interface Request {
      studentUser?: IStudentDocument;
    }
  }
}

// Define token payload interface
interface TokenPayload {
  id: string;
  role: string;
  passkeyId: string;
}

// Student authentication middleware (uses JWT token)
export const authStudent = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;

    // Get token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      try {
        // Extract token from header
        token = req.headers.authorization.split(" ")[1];

        const secret = process.env.JWT_SECRET;

        if (!secret) {
          throw new Error("JWT_SECRET is not defined");
        }

        // Verify token
        const decoded = jwt.verify(token, secret) as string;
        const payload = JSON.parse(decoded) as TokenPayload;

        // Find student by ID and passkey
        const student = await StudentModel.findOne({
          _id: payload.id,
          "passkeys.passkeyId": payload.passkeyId,
        });

        if (!student) {
          res.status(401);
          throw new Error("Invalid student credentials");
        }

        // Get the active passkey
        const activePasskey = student.getActivePasskey();
        if (!activePasskey) {
          res.status(401);
          throw new Error("No active passkey found");
        }

        // Check if passkey is expired
        if (activePasskey.expiresAt && activePasskey.expiresAt <= new Date()) {
          res.status(401);
          throw new Error("Passkey has expired");
        }

        // Check if this is the passkey from the token
        if (activePasskey.passkeyId !== payload.passkeyId) {
          res.status(401);
          throw new Error("Invalid passkey");
        }

        // Attach student to request using studentUser property
        req.studentUser = student;

        // Also attach passkeyId for convenience
        req.headers.passkeyId = payload.passkeyId;

        next();
      } catch (error: any) {
        console.error("Authentication error:", error.message);
        res.status(401);

        if (error.name === "JsonWebTokenError") {
          throw new Error("Invalid token");
        } else if (error.name === "TokenExpiredError") {
          throw new Error("Token expired");
        } else {
          throw new Error("Authentication failed: " + error.message);
        }
      }
    } else {
      // Fallback to legacy passkey+device authentication
      const { passkeyId, deviceId } = req.headers;

      if (!passkeyId || !deviceId) {
        res.status(401);
        throw new Error(
          "Authentication required. Please provide a valid token or passkey credentials"
        );
      }

      try {
        // Find student using passkey and device
        const student = await StudentModel.findByPasskeyAndDevice(
          passkeyId as string,
          deviceId as string
        );

        if (!student) {
          res.status(401);
          throw new Error("Invalid passkey or device");
        }

        // Get the active passkey
        const activePasskey = student.getActivePasskey();
        if (!activePasskey) {
          res.status(401);
          throw new Error("No active passkey found");
        }

        // Check if passkey is expired
        if (activePasskey.expiresAt && activePasskey.expiresAt <= new Date()) {
          res.status(401);
          throw new Error("Passkey has expired");
        }

        // Attach student to request using studentUser property
        req.studentUser = student;

        next();
      } catch (error: any) {
        console.error("Student authentication error:", error);
        res.status(401);
        throw new Error("Authentication failed");
      }
    }
  }
);

// Course access middleware (verifies student has access to specific course)
export const hasAccessToCourse = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { courseId } = req.params;

    if (!courseId) {
      res.status(400);
      throw new Error("Course ID is required");
    }

    if (!req.studentUser) {
      res.status(401);
      throw new Error("Authentication required");
    }

    const student = req.studentUser;

    // Check if student has access to this course
    if (!student.hasCourseAccess(courseId)) {
      res.status(403);
      throw new Error("You do not have access to this course");
    }

    next();
  }
);

// Helper middleware to check if course belongs to institute
export const courseInInstitute = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { courseId, instituteId } = req.params;

    if (!courseId || !instituteId) {
      res.status(400);
      throw new Error("Course ID and Institute ID are required");
    }

    // Check if course belongs to institute (implement this using your models)
    // For example:
    // const course = await CourseModel.findOne({ _id: courseId, instituteId });

    // if (!course) {
    //   res.status(404);
    //   throw new Error('Course not found in this institute');
    // }

    next();
  }
);

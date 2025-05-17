// controllers/auth/institutes.controller.ts
import {
  IInstituteDocument,
  LoginInstituteBody,
  RegisterInstituteBody,
} from "../../types/auth.types";
import { AuthenticatedRequest } from "../../types/request.types";
import { Request, Response } from "express";
import { generateToken } from "../../utils/jwt.utils";
import { InstituteAuth } from "../../models/auth/instituteModel";
import asyncHandler from "express-async-handler";
import logger from "../../utils/logger";

export const registerInstitute = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      instituteName,
      phoneNumber,
      email,
      password,
      instituteType,
      msmeNumber,
      udiseNumber,
    }: RegisterInstituteBody = req.body;

    // Validate required fields
    if (
      !instituteName ||
      !phoneNumber ||
      !email ||
      !password ||
      !instituteType
    ) {
      res.status(400);
      throw new Error("Please add all fields");
    }

    // Check if institute already exists
    const instituteExists = await InstituteAuth.findOne({ email });
    if (instituteExists) {
      res.status(400);
      throw new Error("Institute Already Exists");
    }

    // Create the institute (password hashing is handled by pre-save hook)
    const newInstitute = await InstituteAuth.create({
      instituteName,
      phoneNumber,
      email,
      password,
      instituteType,
      msmeNumber,
      udiseNumber,
    });

    if (newInstitute) {
      const token = generateToken(newInstitute._id.toString());
      res.status(201).json({
        success: true,
        data: {
          _id: newInstitute.id,
          instituteName: newInstitute.instituteName,
          phoneNumber: newInstitute.phoneNumber,
          email: newInstitute.email,
          token: token,
        },
      });
    } else {
      res.status(400);
      throw new Error("Invalid institute data");
    }
  }
);

// Logic for institute login
export const loginInstitute = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body as LoginInstituteBody;

    // Validate input
    if (!email || !password) {
      res.status(400);
      throw new Error("Please provide email and password");
    }

    // Find the institute and explicitly cast to IInstituteDocument
    const instituteLogin = (await InstituteAuth.findOne({
      email,
    })) as IInstituteDocument;
    if (!instituteLogin) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    // Use the comparePassword method from the document
    const isPasswordCorrect = await instituteLogin.comparePassword(password);
    if (!isPasswordCorrect) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    // Log successful login
    logger.info(`Institute login successful: ${instituteLogin._id}`);

    // Return user data with token
    res.json({
      _id: instituteLogin.id,
      instituteName: instituteLogin.instituteName,
      email: instituteLogin.email,
      token: generateToken(instituteLogin._id.toString()),
      message: "Successfully logged in",
    });
  }
);

// Logic for institute logout
export const logoutInstitute = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Log the logout event if institute is authenticated
    if (req.institute) {
      logger.info(`Institute logout: ${req.institute._id}`);
    }

    // Return success message instructing client to remove the token
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
      instructions:
        "Please remove the authentication token from your client storage",
    });
  }
);

import { RegisterInstituteBody } from "../../types/auth.types";
import { AuthenticatedRequest } from "../../types/request.types";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { generateToken } from "../../utils/jwt.utils";

import { InstituteAuth } from "../../models/auth/instituteModel";
import asyncHandler from "express-async-handler";

export const registerInstitute = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      instituteName,
      phoneNumber,
      email,
      password,
    }: RegisterInstituteBody = req.body;
    if (!instituteName || !phoneNumber || !email || !password) {
      res.status(400);
      throw new Error("Please add all fields");
    }

    const instituteExists = await InstituteAuth.findOne({ email });
    if (instituteExists) {
      res.status(400);
      throw new Error("Institute Already Exists");
    }

    const salt = await bcrypt.genSalt(13);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newInstitute = await InstituteAuth.create({
      instituteName,
      phoneNumber,
      email,
      password: hashedPassword,
    });

    if (newInstitute) {
      const token = generateToken(newInstitute._id.toString()); // Generate the token here
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
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400);
      throw new Error("Please provide email and password");
    }

    const instituteLogin = await InstituteAuth.findOne({ email });
    if (!instituteLogin) {
      res.status(400);
      throw new Error("Institute not found");
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      instituteLogin.password
    );

    if (!isPasswordCorrect) {
      res.status(400);
      throw new Error("Invalid credentials");
    }

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
  async (_req: Request, res: Response) => {
    res.json({ message: "Logged out successfully" });
  }
);

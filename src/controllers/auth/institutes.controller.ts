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
      username,
      phoneNumber,
      email,
      password,
    }: RegisterInstituteBody = req.body;
    if (!instituteName || !username || !phoneNumber || !email || !password) {
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
      username,
      phoneNumber,
      email,
      password: hashedPassword,
    });

    if (newInstitute) {
      res.status(201).json({
        success: true,
        data: {
          _id: newInstitute.id,
          instituteName: newInstitute.instituteName,
          phoneNumber: newInstitute.phoneNumber,
          email: newInstitute.email,
          token: generateToken,
        },
      });
    } else {
      res.status(400);
      throw new Error("Invalid institute data");
    }
  }
);

export const loginInstitute = async (req: Request, res: Response) => {
  // Logic for institute login
};
export const profileInstitute = async (req: Request, res: Response) => {
  // Logic for institute login
};

export const verifyInstitute = async (req: Request, res: Response) => {
  // Logic for verifying institute
};

export const createCourse = async (req: Request, res: Response) => {
  // Logic for creating a course
};

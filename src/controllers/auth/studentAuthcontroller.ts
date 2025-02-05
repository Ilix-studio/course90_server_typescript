import { Request, Response } from "express";
import { PasskeyModel } from "../../models/payment/passkeyModel";
import asyncHandler from "express-async-handler";
import { StudentModel } from "../../models/auth/studentModel";
import { StudentAuthenticatedRequest } from "@/types/auth.types";
import { Types } from "mongoose";

const loginStudent = asyncHandler(async (req: Request, res: Response) => {
  const { passkey, deviceId } = req.body;

  const activePasskey = await PasskeyModel.findOne({
    nanoID: passkey,
    status: "ACTIVE",
    expiresAt: { $gt: new Date() },
  }).populate("course");

  if (!activePasskey) {
    res.status(401);
    throw new Error("Invalid or expired passkey");
  }

  let student = await StudentModel.findOne({
    "passcode.passkey": passkey,
    deviceId,
  });

  if (!student) {
    student = await StudentModel.create({
      deviceId,
      passcode: [
        {
          passkey,
          institute: activePasskey.institute,
          course: activePasskey.course,
          isActive: true,
        },
      ],
    });
  }

  res.json({
    studentId: student._id,
    passkey: activePasskey,
    course: activePasskey.course,
  });
});

const switchAccount = asyncHandler(async (req: Request, res: Response) => {
  const { newPasskey, deviceId } = req.body;

  const activePasskey = await PasskeyModel.findOne({
    nanoID: newPasskey,
    status: "ACTIVE",
    expiresAt: { $gt: new Date() },
  });

  if (!activePasskey) {
    res.status(401);
    throw new Error("Invalid or expired passkey");
  }

  const student = await StudentModel.findOneAndUpdate(
    { deviceId },
    {
      $push: {
        passcode: {
          passkey: newPasskey,
          institute: activePasskey.institute,
          course: activePasskey.course,
          isActive: true,
        },
      },
    },
    { new: true }
  );

  res.json({ success: true, student });
});

const getPerformance = asyncHandler(async (req: Request, res: Response) => {});

export { loginStudent, getPerformance, switchAccount };

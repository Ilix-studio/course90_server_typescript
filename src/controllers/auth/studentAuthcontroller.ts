import { RenewPasskeyRequest } from "../../types/passkey.types";

import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { PasskeyModel } from "../../models/passkeys/passkeyModel";
import { PASSKEY_PRICING, PasskeyStatus } from "../../constants/enums";
import { isValidPasskeyFormat } from "../../utils/nanoidGenerator";

// Validate a passkey
export const validatePasskey = asyncHandler(
  async (req: Request, res: Response) => {
    const { passkey, deviceId } = req.body;

    // Validate passkey format
    if (!passkey || !isValidPasskeyFormat(passkey)) {
      res.status(400);
      throw new Error("Invalid passkey format");
    }

    // Validate device ID
    if (!deviceId) {
      res.status(400);
      throw new Error("Device ID is required");
    }

    // Find passkey in database
    const passkeyDoc = await PasskeyModel.findOne({ passkeyId: passkey })
      .populate({
        path: "instituteId",
        select: "instituteName email",
      })
      .populate({
        path: "courseId",
        select: "name description",
      });

    // If passkey not found or not in PENDING status
    if (!passkeyDoc) {
      res.status(404);
      throw new Error("Passkey not found");
    }

    // If passkey is already used
    if (passkeyDoc.status !== PasskeyStatus.PENDING) {
      res.status(400);

      if (
        passkeyDoc.status === PasskeyStatus.ACTIVE &&
        passkeyDoc.deviceId === deviceId
      ) {
        res.json({
          message: "This passkey is already active on this device",
          isActive: true,
          passkey: passkeyDoc.passkeyId,
          expiresAt: passkeyDoc.expiresAt,
        });
        return; // Early return to stop execution, but no returned value
      } else if (passkeyDoc.status === PasskeyStatus.ACTIVE) {
        throw new Error("This passkey is already active on another device");
      } else if (passkeyDoc.status === PasskeyStatus.EXPIRED) {
        throw new Error("This passkey has expired");
      } else {
        throw new Error(
          `Passkey is in ${passkeyDoc.status} state and cannot be used`
        );
      }
    }

    // Send JSON response without returning it
    res.json({
      message: "Passkey validated successfully",
      pricingOptions: PASSKEY_PRICING,
      course: {
        id: passkeyDoc.courseId._id,
      },
      institute: {
        id: passkeyDoc.instituteId._id,
      },
      passkey: passkeyDoc.passkeyId,
    });
  }
);

export const renewPasskey = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { passkeyId, durationMonths }: RenewPasskeyRequest = req.body;
    // Validate request
    if (!passkeyId) {
      res.status(400);
      throw new Error("Passkey ID is required");
    }

    if (durationMonths !== 1 && durationMonths !== 12) {
      res.status(400);
      throw new Error("Duration must be either 1 or 12 months");
    }
    // Find passkey
    const passkey = await PasskeyModel.findOne({ passkeyId });

    if (!passkey) {
      res.status(404);
      throw new Error("Passkey not found");
    }

    // Check if passkey is eligible for renewal
    if (!passkey.isRenewable()) {
      res.status(400);
      throw new Error("Passkey is not eligible for renewal");
    }
    // Return information for renewal payment
    res.json({
      success: true,
      passkeyId: passkey.passkeyId,
      courseId: passkey.courseId,
      durationMonths,
      status: passkey.status,
      expiresAt: passkey.expiresAt,
      renewalEligible: true,
    });
  }
);

export const loginStudent = asyncHandler(
  async (req: Request, res: Response) => {}
);

export const switchAccount = asyncHandler(
  async (req: Request, res: Response) => {}
);

export const getPerformance = asyncHandler(
  async (req: Request, res: Response) => {}
);

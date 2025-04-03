import { AuthenticatedRequest } from "@/types/request.types";
import { PasskeyModel } from "../../models/passkeys/passkeyModel";

import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { nanoid } from "nanoid";
import { calculateExpirationDate } from "../../utils/calculateExpiration";

export const generatePasskey = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {}
);

// Activate a passkey (called after payment verification)
export const activatePasskey = asyncHandler(
  async (req: Request, res: Response) => {}
);

export const markPasskeyForRevival = asyncHandler(
  async (req: Request, res: Response) => {}
);

export const reactivatePasskey = asyncHandler(async (req, res) => {
  const { passkeyId, timePeriod, paymentId } = req.body;
});

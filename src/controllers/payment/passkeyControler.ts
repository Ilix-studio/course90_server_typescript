import { PasskeyStatus } from "../../constants/enums";
import { PasskeyModel } from "../../models/payment/passkeyModel";
import { NewPaymentModel } from "../../models/payment/paymentModel";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { nanoid } from "nanoid";

const generatePasskey = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, count, timePeriod, paymentId } = req.body;
  const institute = req.body.institute;

  const payment = await NewPaymentModel.findById(paymentId);
  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }

  if (payment.payStatus !== "SUCCESS") {
    res.status(400);
    throw new Error("Payment not completed");
  }

  const passkeys = [];
  for (let i = 0; i < count; i++) {
    const nanoID = nanoid(10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(timePeriod));

    const passkey = await PasskeyModel.create({
      nanoID,
      course: courseId,
      institute: institute._id,
      payment: payment._id,
      timePeriod,
      status: PasskeyStatus.ACTIVE,
      generatedAt: new Date(),
      expiresAt,
    });

    passkeys.push(passkey);
  }

  res.status(201).json({
    success: true,
    passkeys: passkeys.map((p) => ({
      nanoID: p.nanoID,
      expiresAt: p.expiresAt,
    })),
  });
});

const validatePasskey = asyncHandler(async (req: Request, res: Response) => {
  const { passkeyId } = req.params;

  const passkey = await PasskeyModel.findOne({
    nanoID: passkeyId,
    status: PasskeyStatus.ACTIVE,
    expiresAt: { $gt: new Date() },
  });

  if (!passkey) {
    res.status(404);
    throw new Error("Invalid or expired passkey");
  }

  res.json({
    valid: true,
    expiresAt: passkey.expiresAt,
    course: passkey.course,
  });
});

export { generatePasskey, validatePasskey };

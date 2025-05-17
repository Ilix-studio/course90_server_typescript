import { ISubscriptionHistory } from "../../types/passkey.types";
import { Schema } from "mongoose";

export const subscriptionHistory = new Schema<ISubscriptionHistory>(
  {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    durationMonths: {
      type: Number,
      required: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { _id: true, timestamps: true }
);

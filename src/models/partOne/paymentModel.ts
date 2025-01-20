import { Schema, model, Document } from "mongoose";

// models/NewPaymentInfo.ts
export interface PaymentInfo extends Document {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  institute: Schema.Types.ObjectId;
  course: Schema.Types.ObjectId;
  timePeriod: string;
  passkeyCount: number;
  amount: number;
  orderDate: Date;
  payStatus: "IDLE" | "PROCESSING" | "SUCCESS" | "FAILED";
}

const paymentSchema = new Schema<PaymentInfo>({
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  institute: { type: Schema.Types.ObjectId, ref: "Institute" },
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  timePeriod: { type: String },
  passkeyCount: { type: Number },
  amount: { type: Number },
  orderDate: { type: Date, default: Date.now },
  payStatus: {
    type: String,
    enum: ["IDLE", "PROCESSING", "SUCCESS", "FAILED"],
    default: "IDLE",
  },
});

export const NewPaymentModel = model<PaymentInfo>(
  "NewPaymentInfo",
  paymentSchema
);

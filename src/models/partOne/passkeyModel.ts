import { Schema, model, Document } from "mongoose";

export interface Passkey extends Document {
  nanoID: string;
  timePeriod: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  generatedAt: Date;
  activatedAt?: Date;
  expiresAt: Date;
  isUsed: boolean;
  usedBy?: Schema.Types.ObjectId;
  payment: Schema.Types.ObjectId;
  institute: Schema.Types.ObjectId;
  course: Schema.Types.ObjectId;
  student: Schema.Types.ObjectId; // Reference to the student (optional, for tracking)
}

const passkeySchema = new Schema<Passkey>(
  {
    nanoID: { type: String, required: true, unique: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    timePeriod: { type: String, required: true },
    status: {
      type: String,
      enum: ["ACTIVE", "EXPIRED", "REVOKED"],
      default: "ACTIVE",
    },
    generatedAt: { type: Date, required: true },
    activatedAt: { type: Date },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
    usedBy: { type: Schema.Types.ObjectId, ref: "Student" },
    payment: {
      type: Schema.Types.ObjectId,
      ref: "NewPaymentInfo",
      required: true,
    },
    institute: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },
    student: { type: Schema.Types.ObjectId, ref: "Student" },
  },
  { timestamps: true }
);

export const PasskeyModel = model<Passkey>("Passkey", passkeySchema);

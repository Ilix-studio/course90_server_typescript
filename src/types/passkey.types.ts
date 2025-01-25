import { Document, Types } from "mongoose";

export type PasskeyStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export interface IPasskey {
  nanoID: string[];
  timePeriod: string;
  status: PasskeyStatus;
  generatedAt: Date;
  activatedAt?: Date;
  expiresAt: Date;
  isUsed: boolean;
  usedBy?: Types.ObjectId;
  payment: Types.ObjectId;
  institute: Types.ObjectId;
  course: Types.ObjectId;
  student?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPasskeyDocument extends IPasskey, Document {
  _id: string;
}

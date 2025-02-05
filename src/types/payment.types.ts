import { PaymentStatus } from "../constants/enums";

export interface IPayment {
  _id: string;
  orderId: string;
  paymentId: string;
  signature: string;
  amount: number;
  instituteId: string;
  selectedCourse: string;
  passkeyCount: number;
  selectedTimePeriod: number;
  payStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface INanoId {
  _id: string;
  nanoID: string[];
  courseName: string;
  timePeriod: number;
  generatedAt: Date;
  activatedAt: Date;
  expiresAt: Date;
  isUsed: boolean;
  usedBy: string | null;
  payment: string;
  instituteId: string;
  createdAt: Date;
  updatedAt: Date;
}

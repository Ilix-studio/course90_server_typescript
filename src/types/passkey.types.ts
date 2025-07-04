import { Types } from "mongoose";
import { PackageType, PasskeyStatus } from "../constants/enums";

// Passkey Interface
export interface IPasskey {
  passkeyId: string;
  instituteId: string;
  courseId: string;
  packageType: PackageType;
  durationMonths: number;
  status: PasskeyStatus;
  generatedAt: Date;
  generatedBy: string;
  activatedAt?: Date;
  expiresAt?: Date;
  studentId?: string;
  deviceId?: string; // For device activation
  paymentId?: string;
  nextPlatformFeeDue: Date;
  accessCount: number;
  statusHistory: PasskeyStatusHistory[];
}

// Status history for tracking passkey state changes
export interface PasskeyStatusHistory {
  status: PasskeyStatus;
  changedAt: Date;
  changedBy: string;
  reason?: string;
}

// Enhanced Passkey Model
export interface IEnhancedPasskey {
  passkeyId: string;
  instituteId: string;
  courseId: string;
  packageType: PackageType;

  // Platform fee structure
  platformFee: {
    amount: 90;
    frequency: "MONTHLY";
    nextPaymentDue: Date;
    isPaid: boolean;
    paidBy: "INSTITUTE" | "STUDENT";
  };

  // Institute course access (separate from platform fee)
  courseAccess: {
    hasAccess: boolean;
    accessVerifiedBy: "INSTITUTE" | "SYSTEM";
    verificationMethod: "OFFLINE_PAYMENT" | "MANUAL_APPROVAL";
    notes?: string;
  };

  // Student assignment
  assignedStudent?: string;
  deviceIds: string[]; // Array of device IDs for multi-device activation
}

// API Request Types
export interface GeneratePasskeysRequest {
  courseId: string;
  packageType: PackageType;
  quantity: number;
  durationMonths: number;
}

export interface ActivatePasskeyRequest {
  passkeyId: string;
  courseId: string;
  deviceId: string;
  paymentId?: string;
}

export interface ReactivatePasskeyRequest {
  passkeyId: string;
  reason?: string;
}

export interface CalculatePriceRequest {
  packageType: PackageType;
  durationMonths: number;
  quantity: number;
}
/**
 * Interface for subscription history entries
 */
export interface ISubscriptionHistory {
  _id?: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  paymentId?: Types.ObjectId;
  amount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

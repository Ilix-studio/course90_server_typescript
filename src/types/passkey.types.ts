// src/types/passkey.types.ts
import { Document, Types } from "mongoose";
import { PasskeyStatus } from "../constants/enums";

/**
 * Interface representing the structure of a passkey in the database
 */
export interface IPasskey {
  // Unique identifier for the passkey (used for authentication)
  passkeyId: string;

  // The institute that generated this passkey
  instituteId: Types.ObjectId;

  // The course this passkey grants access to
  courseId: Types.ObjectId;

  // Current status of the passkey
  status: PasskeyStatus;

  // Duration of the passkey validity in months
  durationMonths: number;

  // When the passkey was generated
  generatedAt: Date;

  // When the passkey was activated (after payment)
  activatedAt?: Date;

  // When the passkey will expire
  expiresAt?: Date;

  // The student who is using this passkey (if any)
  studentId?: Types.ObjectId;

  // The device ID associated with this passkey
  deviceId?: string;

  // Reference to the payment that activated this passkey
  paymentId?: Types.ObjectId;
}

/**
 * Interface that extends IPasskey with Mongoose Document properties
 */
export interface IPasskeyDocument extends IPasskey, Document {
  _id: string;
  isValid(): boolean;
  getRemainingDays(): number;
}

/**
 * Interface for generating passkey request body
 */
export interface GeneratePasskeysRequest {
  // The course ID for which to generate passkeys
  courseId: string;

  // Number of passkeys to generate
  count: number;
}

/**
 * Interface for activate passkey request body
 */
export interface ActivatePasskeyRequest {
  // The passkey ID to activate
  passkeyId: string;

  // Duration in months for which to activate the passkey
  durationMonths: number;

  // Device ID of the student's device
  deviceId: string;
  paymentId: string;
}

/**
 * Interface for validate passkey request body
 */
export interface ValidatePasskeyRequest {
  // The passkey ID to validate
  passkeyId: string;

  // Device ID of the student's device
  deviceId: string;
}

/**
 * Interface for passkey response object
 */
export interface PasskeyResponse {
  _id: string;
  passkeyId: string;
  status: PasskeyStatus;
  courseId: string;
  courseName?: string;
  instituteId: string;
  instituteName?: string;
  durationMonths: number;
  activatedAt?: Date;
  expiresAt?: Date;
}

/**
 * Interface for bulk passkey generation response
 */
export interface BulkPasskeyGenerationResponse {
  count: number;
  passkeys: string[];
  courseId: string;
  courseName: string;
}

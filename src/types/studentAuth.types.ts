// src/types/studentAuth.types.ts
import { Document, Model, Types } from "mongoose";

/**
 * Represents a passkey assigned to a student
 */
export interface IStudentPasskey {
  passkeyId: string;
  institute: Types.ObjectId;
  courseId: Types.ObjectId;
  isActive: boolean;
  activatedAt: Date;
  expiresAt?: Date;
}

/**
 * Base student interface
 */
export interface IStudent {
  _id?: Types.ObjectId;
  name?: string;
  email?: string;
  phoneNumber?: string;
  deviceId: string;
  passkeys: IStudentPasskey[]; // Array of passkeys (previously called nanoId)
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Student document interface with instance methods
 */
export interface IStudentDocument extends Omit<IStudent, "_id">, Document {
  _id: Types.ObjectId;
  getActivePasskey(): IStudentPasskey | undefined;
  hasCourseAccess(courseId: string): boolean;
}

/**
 * Student model interface with static methods
 */
export interface IStudentModel extends Model<IStudentDocument> {
  findByPasskeyAndDevice(
    passkeyId: string,
    deviceId: string
  ): Promise<IStudentDocument | null>;

  findActiveStudent(
    passkeyId: string,
    deviceId: string
  ): Promise<IStudentDocument | null>;
}

// Request/Response interfaces
export interface StudentLoginBody {
  passkeyId: string;
  deviceId: string;
}

export interface ValidatePasskeyBody {
  passkey: string;
  deviceId: string;
}

export interface SwitchPasskeyBody {
  newPasskey: string;
}

export interface UpdateStudentBody {
  name?: string;
  email?: string;
  phoneNumber?: string;
}

export interface IStudentResponse {
  _id: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  token?: string;
  activePasskey?: {
    passkeyId: string;
    courseId: {
      _id: string;
      name: string;
    };
    institute: {
      _id: string;
      name: string;
    };
    expiresAt?: Date;
  };
}

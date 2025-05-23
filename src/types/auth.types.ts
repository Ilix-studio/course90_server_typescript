// Update to auth.types.ts
import { InstituteType } from "../constants/enums";
import { Document, Types } from "mongoose";

// Basic Institute interface without methods
export interface IInstitute {
  _id: string;
  instituteName: string;
  phoneNumber: number; // Note: Changed from string to number to match your schema
  email: string;
  password: string;
  instituteType: InstituteType;
  msmeNumber?: string; // For coaching institutes
  udiseNumber?: string; // For schools
  courses?: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Document interface that includes Mongoose methods
export interface IInstituteDocument extends IInstitute, Document {
  _id: string;
  __v: number;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IInstituteModel extends IInstituteDocument {
  // Any additional static methods would go here
}

export interface RegisterInstituteBody {
  instituteName: string;
  phoneNumber: number; // Note: Changed from string to number
  email: string;
  password: string;
  instituteType: InstituteType;
  msmeNumber?: string;
  udiseNumber?: string;
}

export interface LoginInstituteBody {
  email: string;
  password: string;
}

// Additional type for response data
export interface IInstituteResponse {
  _id: string;
  instituteName: string;
  phoneNumber: number; // Note: Changed from string to number
  email: string;
  token?: string;
  message?: string;
}

// The rest of your type definitions...

//Student Part
export interface IStudentPasscode {
  passkeyId: string;
  instituteName: string;
  course: Types.ObjectId;
  isActive: boolean;
  activatedAt: Date;
  expiresAt?: Date;
}

export interface IStudent {
  _id: string;
  name?: string;
  email?: string;
  nanoId: IStudentPasscode[];
  deviceId: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface IStudentModel extends IStudent, Document {
  _id: string;
  __v: number;
}

export interface StudentLoginBody {
  instituteName: string;
  passkey: string;
  deviceId: string;
}

export interface SwitchPasskeyBody {
  newPasskey: string;
}

export interface UpdateStudentBody {
  name?: string;
  email?: string;
}

export interface IStudentResponse {
  _id: string;
  name?: string;
  email?: string;
  token: string;
  activePasskey?: {
    passkey: string;
    course: {
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
// Request types with authentication
export interface AuthenticatedRequest extends Request {
  institute?: IInstituteModel;
}
export interface StudentAuthenticatedRequest extends Request {
  student?: IStudentModel;
}

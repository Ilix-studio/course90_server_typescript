import { InstituteType } from "../constants/enums";
import { Document, Types } from "mongoose";

// This file defines all the TypeScript interfaces needed for your authentication system,

export interface IInstitute extends Document {
  _id: string;
  instituteName: string;
  phoneNumber: number;
  email: string;
  password: string;
  instituteType: InstituteType;
  msmeNumber?: string; // For coaching institutes
  udiseNumber?: string; // For schools
  // idCardPhoto?: string;         // For tutors
  courses: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
export interface IInstituteModel extends IInstitute, Document {
  _id: string;
  __v: number;
}

export interface RegisterInstituteBody {
  instituteName: string;
  phoneNumber: string;
  email: string;
  password: string;
  instituteType: InstituteType;
  msmeNumber?: string;
  udiseNumber?: string;
  // idCardPhoto?: string;
}

export interface LoginInstituteBody {
  email: string;
  password: string;
}

export interface IInstituteDocument extends IInstitute, Document {
  _id: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Additional type for response data
export interface IInstituteResponse {
  _id: string;
  instituteName: string;
  phoneNumber: string;
  email: string;
  token?: string;
}

//Student Part
export interface IStudentPasscode {
  passkey: string;
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

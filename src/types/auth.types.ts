// types/auth.types.ts
import { InstituteType, PackageType, UserRole } from "../constants/enums";
import { Document, Types } from "mongoose";

// Base interfaces
export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Principal (Institute) interface
export interface IPrincipal extends IUser {
  role: UserRole.PRINCIPAL;
  instituteName: string;
  phoneNumber: number;
  instituteType: InstituteType;
  msmeNumber?: string;
  udiseNumber?: string;
  courseId: Types.ObjectId[];
  teachers: Types.ObjectId[];
  profile: Types.ObjectId[];
}

export interface IPrincipalDocument extends Omit<IPrincipal, "_id">, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Teacher interface
export interface ITeacher extends IUser {
  role: UserRole.TEACHER;
  applicationId: string; // Unique teacher login ID
  phoneNumber: number;
  instituteId: Types.ObjectId;
  assignedSubjects: Types.ObjectId[];
  permissions: string[];
  isCredentialsSent: boolean;
  credentialsSentAt?: Date;
}

export interface ITeacherDocument extends Omit<ITeacher, "_id">, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Super Admin interface (for you)
export interface ISuperAdmin extends IUser {
  role: UserRole.SUPER_ADMIN;
}

export interface ISuperAdminDocument
  extends Omit<ISuperAdmin, "_id">,
    Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Request body interfaces
export interface RegisterPrincipalBody {
  _id: string;
  instituteName: string;
  email: string;
  password: string;
  phoneNumber: number;
  instituteType: InstituteType;
  msmeNumber?: string;
  udiseNumber?: string;
}
export interface LoginPrincipalBody {
  instituteName: string;
  email: string;
  password: string;
}

export interface CreateTeacherBody {
  name: string;
  phoneNumber: number;
  assignedSubjects: string[];
  permissions: string[];
}
export interface LoginTeacherBody {
  applicationId?: string;
  password: string;
}

export interface GeneratePasskeyBody {
  courseId: string;
  packageType: PackageType;
  durationMonths: number;
  quantity: number;
}

// Response interfaces
export interface InstituteAuthResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token: string;
}

// Express Request extensions
declare global {
  namespace Express {
    interface Request {
      user?: IPrincipalDocument | ITeacherDocument | ISuperAdminDocument;
      userRole?: UserRole;
      instituteId?: string;
    }
  }
}

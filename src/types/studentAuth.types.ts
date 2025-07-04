import { Document, Types } from "mongoose";
import { InstituteType, PackageType, UserRole } from "../constants/enums";

// Student interfaces (keeping existing passkey system)
export interface IStudentPasscode {
  passkeyId: string;
  institute: Types.ObjectId;
  course: Types.ObjectId;
  isActive: boolean;
  activatedAt: Date;
  expiresAt?: Date;
}

export interface IStudent {
  _id?: Types.ObjectId;
  name?: string;
  email?: string;
  deviceId: string;
  nanoId: IStudentPasscode[]; // Array of passcodes
  createdAt?: Date;
  updatedAt?: Date;
}

// Document interface with Mongoose methods
export interface IStudentDocument extends Omit<IStudent, "_id">, Document {
  _id: Types.ObjectId;
  getActivePasscode(): IStudentPasscode | undefined;
  hasCourseAccess(courseId: string): boolean;
}

// Model interface (alias for backward compatibility)
export interface IStudentModel extends IStudentDocument {}

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
}

export interface IStudentResponse {
  _id: string;
  name?: string;
  email?: string;
  token?: string;
  activePasskey?: {
    passkeyId: string;
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

// Other existing interfaces...
export interface IStudentPasskey {
  passkeyId: string;
  institute: Types.ObjectId;
  course: Types.ObjectId;
  isActive: boolean;
  activatedAt: Date;
  expiresAt?: Date;
}

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
  applicationId: string;
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

// Super Admin interface
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
      student?: IStudentDocument; // Add student to request
    }
  }
}

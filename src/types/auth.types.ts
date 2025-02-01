import { Document } from "mongoose";

export interface IInstitute {
  _id: string;
  instituteName: string;
  username: string;
  phoneNumber: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface IInstituteModel extends IInstitute, Document {
  _id: string;
  __v: number;
}
export interface IStudent {
  _id: string;
  name: string;
  email: string;
  nanoId: string[];
  createdAt: Date;
  updatedAt: Date;
}
export interface RegisterInstituteBody {
  instituteName: string;
  username: string;
  phoneNumber: string;
  email: string;
  password: string;
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
  username: string;
  phoneNumber: string;
  email: string;
  token?: string;
}

export interface CreateGeneralQuestionBody {
  courseId: string; // Changed from courseName to courseId
  subject: string;
  language: string;
  topic: string;
}

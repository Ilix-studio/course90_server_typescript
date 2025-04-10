import { Document, Types } from "mongoose";

export interface IMCQ {
  _id?: Types.ObjectId;
  questionName: string;
  options: string[];
  correctOption: number;
}
export interface CreateGeneralQuestionBody {
  courseId: string; // Changed from courseName to courseId
  subject: string;
  language: string;
  topic: string;
}
export interface IGeneralQuestionSet {
  instituteId: string;
  courseId: string;
  subject: string;
  language: string;
  topic: string;
  mcqs: IMCQ[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IMockQuestionSet extends Omit<IGeneralQuestionSet, "topic"> {
  duration: number;
  totalMarks: number;
  passingMarks: number;
}

export interface MCQDocument extends Document {
  _id: Types.ObjectId;
}
export interface IMCQDocumentt extends IMCQ {
  _id: Types.ObjectId;
}
export interface CreateGeneralQuestionBody {
  courseId: string;
  subject: string;
  language: string;
  topic: string;
}
export interface CreateMockQuestionBody {
  courseId: string;
  subject: string;
  language: string;
  totalMarks: number;
  passingMarks: number;
}
export interface MCQData {
  questionName: string;
  options: string[];
  correctOption: number;
  performanceData?: {
    timeTaken?: number;
    attempts?: number;
    marks?: number;
  };
}
// types.ts

export interface IPerformanceMCQ {
  questionName: string;
  options: string[];
  correctOption: number;
  performanceData?: {
    timeTaken?: number;
    attempts?: number;
    marks?: number;
  };
  _id?: Types.ObjectId;
}

export interface IMockMCQ extends Document {
  subject: string;
  language: string;
  totalMarks: number;
  passingMarks: number;
  mcqs: Types.DocumentArray<IPerformanceMCQ & Document>;
  courseId: Types.ObjectId;
}

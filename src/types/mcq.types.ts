import { Document, Types } from "mongoose";

export interface IMCQ {
  questionName: string;
  options: string[];
  correctOption: number;
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
export interface CreateGeneralQuestionBody {
  courseId: string; // Changed from courseName to courseId
  subject: string;
  language: string;
  topic: string;
}

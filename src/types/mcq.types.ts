export interface IMCQ {
  questionName: string;
  options: string[];
  correctOption: number;
}

export interface IGeneralQuestionSet {
  instituteId: string;
  courseName: string;
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

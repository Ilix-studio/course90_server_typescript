import { AuthenticatedRequest } from "./request.types";

export interface CreateNoteRequest extends AuthenticatedRequest {
  body: {
    courseId: string;
    subject: string;
    language: string;
    topic: string;
    notebody: {
      title: string;
      content: string;
    }[];
  };
}

export interface UpdateNoteRequest extends AuthenticatedRequest {
  params: {
    noteSetId: string;
  };
  body: {
    subject?: string;
    language?: string;
    topic?: string;
    notebody?: {
      title: string;
      content: string;
    }[];
  };
}

export interface DeleteNoteRequest extends AuthenticatedRequest {
  params: {
    noteSetId: string;
  };
}

export interface NoteBodyRequest extends AuthenticatedRequest {
  params: {
    noteSetId: string;
    noteBodySetId: string;
  };
  body: {
    title?: string;
    content?: string;
  };
}

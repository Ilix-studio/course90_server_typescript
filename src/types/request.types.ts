// types/request.types.ts
import { Request } from "express";
import {
  IPrincipalDocument,
  ITeacherDocument,
  ISuperAdminDocument,
} from "./auth.types";
import { UserRole } from "../constants/enums";

export interface AuthenticatedRequest extends Request {
  user?: IPrincipalDocument | ITeacherDocument | ISuperAdminDocument;
  userRole?: UserRole;
  instituteId?: string;
}

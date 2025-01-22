import { Request } from "express";
import { IInstitute } from "./auth.types";

export interface AuthenticatedRequest extends Request {
  institute?: IInstitute;
}

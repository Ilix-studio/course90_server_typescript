// types/profile.types.ts
import { Document, Types, PopulatedDoc } from "mongoose";
import { AuthenticatedRequest } from "./request.types";

export interface InstituteProfileBody {
  instituteName: string;
  address: string;
  phoneNumber: number;
  website?: string;
  bio?: string;
  logo?: string;
  instituteId: string;
}

export interface ProfileRequest extends AuthenticatedRequest {
  body: InstituteProfileBody;
}

export interface IInstituteProfileDocument extends Document {
  instituteName: string;
  address: string;
  phoneNumber: number;
  website?: string;
  bio?: string;
  logo?: string;
  institute: PopulatedDoc<Document & { _id: Types.ObjectId }>;
}

export interface IInstituteProfile {
  instituteName: string;
  address: string;
  phoneNumber: number;
  website?: string;
  bio?: string;
  logo?: string;
  institute: Types.ObjectId;
}

export interface GetProfileParams {
  profileId: string;
}

export interface ProfileResponse {
  message: string;
  profile: IInstituteProfile;
}

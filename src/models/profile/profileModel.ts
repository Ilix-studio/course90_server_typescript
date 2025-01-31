import { Schema, model, Document, Types } from "mongoose";

//Institute = can be schools/ college/ university/ personal tutor
interface Profile extends Document {
  instituteName: string;
  address: string;
  phoneNumber: number;
  website: string;
  bio: string;
  logo: string;
  institute: Types.ObjectId;
}
const instituteProfileSchema = new Schema<Profile>({
  instituteName: { type: String },
  address: { type: String, unique: true },
  phoneNumber: { type: Number, unique: true },
  website: { type: String, unique: true },
  bio: { type: String },
  institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true },
});

export const InstituteProfileModel = model<Profile>(
  "InstituteProfile",
  instituteProfileSchema
);

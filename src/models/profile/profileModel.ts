import { Schema, model, Document, Types } from "mongoose";

// Profile interface that matches the controller expectations
interface IProfile extends Document {
  instituteName: string;
  address: string;
  phoneNumber: number;
  website?: string;
  bio?: string;
  logo?: string;
  institute: Types.ObjectId;
}

const instituteProfileSchema = new Schema<IProfile>(
  {
    instituteName: { type: String },
    address: { type: String, unique: true },
    phoneNumber: { type: Number, unique: true },
    website: { type: String, unique: true },
    bio: { type: String },
    logo: { type: String },
    institute: {
      type: Schema.Types.ObjectId,
      ref: "InstituteAuth", // Changed to match your actual model name
      required: true,
    },
  },
  {
    timestamps: true, // Add timestamps for better tracking
  }
);

export const InstituteProfileModel = model<IProfile>(
  "InstituteProfile",
  instituteProfileSchema
);

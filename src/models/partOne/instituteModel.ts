import { Schema, model, Document } from "mongoose";

//Institute = can be schools/ college/ university/ personal tutor
interface Institute extends Document {
  name: string;
  email: string;
  password: string;
  googleId?: string;
  govtId: string;
  isVerified: boolean;
  courses: Schema.Types.ObjectId[];
}
const instituteSchema = new Schema<Institute>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  googleId: { type: String },
  govtId: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  courses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
});

export const Institute = model<Institute>("Institute", instituteSchema);

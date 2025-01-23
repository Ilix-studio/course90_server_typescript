import { Schema, model, Document } from "mongoose";
import bcrypt from "bcryptjs";
import { number } from "joi";

//Institute = can be schools/ college/ university/ personal tutor
interface Institute extends Document {
  instituteName: string;
  email: string;
  phoneNumber: number;
  password: string;
  googleId?: string;
  govtId: string;
  isVerified: boolean;
  courses: Schema.Types.ObjectId[];
}
const instituteSchema = new Schema<Institute>({
  instituteName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: Number, unique: true },
  password: { type: String },
  googleId: { type: String },
  govtId: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  courses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
});
instituteSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};
export const InstituteAuth = model<Institute>("InstituteAuth", instituteSchema);

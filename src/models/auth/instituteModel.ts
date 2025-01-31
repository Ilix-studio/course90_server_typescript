import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";

//Institute = can be schools/ college/ university/ personal tutor
interface Institute extends Document {
  _id: Types.ObjectId;
  instituteName: string;
  email: string;
  phoneNumber: number;
  password: string;
  courses: Schema.Types.ObjectId[];
}
const instituteSchema = new Schema<Institute>({
  instituteName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: Number, unique: true },
  password: { type: String, required: true },
  courses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
});
instituteSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};
export const InstituteAuth = model<Institute>("InstituteAuth", instituteSchema);

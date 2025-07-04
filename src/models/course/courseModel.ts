import { PricingModel } from "../../constants/enums";
import { Schema, model, Document, Types } from "mongoose";

// Course Pricing (embedded in course)
export interface ICoursePricing {
  pricingModel: PricingModel;
  currency: string;
  basePrice?: number;
  subscriptionDuration?: number;
  taxRate?: number;
  taxIncluded: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICourse extends Document {
  name: string;
  instituteId: Types.ObjectId;
  subjects: Types.ObjectId;
  hasPricing: boolean;
  thumbnail: string;
  // Embedded pricing
  pricing?: ICoursePricing;
  isPaidCourse: boolean;
  language: string;
  totalLikes: number;
  totalShares: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Statistics
  totalStudents: number;
  totalEnrollments: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  totalQuestions: number;
  totalMockTests: number;
  totalNotes: number;
  lastContentUpdate: Date;
}

const coursePricingSchema = new Schema(
  {
    pricingModel: {
      type: String,
      enum: Object.values(PricingModel),
      required: true,
      default: PricingModel.FREE,
    },
    currency: { type: String, default: "INR" },
    basePrice: { type: Number, min: 0 },
    subscriptionDuration: { type: Number, min: 1 },

    isActive: { type: Boolean, default: true },
    createdByModel: { type: String, enum: ["Principal"], required: true },
  },
  { timestamps: true, _id: false }
);

const courseSchema = new Schema<ICourse>({
  name: { type: String, required: true },
  instituteId: {
    type: Schema.Types.ObjectId,
    ref: "Principal",
    required: true,
  },
  subjects: [{ type: Schema.Types.ObjectId, ref: "Subject" }],
  // EMBEDDED PRICING
  pricing: { type: coursePricingSchema, default: null },
  thumbnail: {
    type: String,
    trim: true,
  },
  language: {
    type: String,
    default: "English",
    trim: true,
  },
  totalLikes: { type: Number },
  totalShares: { type: Number },
  // Course statistics
  totalStudents: {
    type: Number,
    default: 0,
    min: 0,
  },

  totalEnrollments: {
    type: Number,
    default: 0,
    min: 0,
  },

  totalRevenue: {
    type: Number,
    default: 0,
    min: 0,
  },

  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },

  totalReviews: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Content statistics
  totalQuestions: {
    type: Number,
    default: 0,
    min: 0,
  },

  totalMockTests: {
    type: Number,
    default: 0,
    min: 0,
  },

  totalNotes: {
    type: Number,
    default: 0,
    min: 0,
  },
  isActive: { type: Boolean, default: true },
});

// Indexes
courseSchema.index({ instituteId: 1 });
courseSchema.index({ name: 1, instituteId: 1 }, { unique: true });
courseSchema.index({ isActive: 1 });
courseSchema.index({ isPaidCourse: 1 });

courseSchema.virtual("externalPricing", {
  ref: "CoursePricing",
  localField: "_id",
  foreignField: "courseId",
  justOne: true,
});

export const CourseModel = model<ICourse>("Course", courseSchema);

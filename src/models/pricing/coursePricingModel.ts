// models/pricing/coursePricingModel.ts
import { CurrencyCode, PricingModel } from "../../constants/enums";
import { Schema, model, Document, Types } from "mongoose";

export interface ICoursePricing extends Document {
  courseId: Types.ObjectId;
  instituteId: Types.ObjectId;
  pricingModel: PricingModel;
  currency: CurrencyCode;
  basePrice?: number;
  subscriptionDuration?: number;
  taxRate?: number;
  taxIncluded: boolean;
  allowPartialPayment: boolean;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const coursePricingSchema = new Schema<ICoursePricing>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      unique: true,
    },
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Principal",
      required: true,
    },
    pricingModel: {
      type: String,
      enum: Object.values(PricingModel),
      required: true,
      default: PricingModel.FREE,
    },
    currency: {
      type: String,
      enum: Object.values(CurrencyCode),
      default: CurrencyCode.INR,
    },
    basePrice: {
      type: Number,
      min: 0,
      required: function (this: ICoursePricing) {
        return (
          this.pricingModel === PricingModel.ALREADY_PAID ||
          this.pricingModel === PricingModel.SUBSCRIPTION
        );
      },
    },
    subscriptionDuration: {
      type: Number,
      min: 1,
      required: function (this: ICoursePricing) {
        return this.pricingModel === PricingModel.SUBSCRIPTION;
      },
    },

    taxRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    taxIncluded: {
      type: Boolean,
      default: false,
    },
    allowPartialPayment: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
coursePricingSchema.index({ courseId: 1 }, { unique: true });
coursePricingSchema.index({ instituteId: 1 });
coursePricingSchema.index({ pricingModel: 1 });
coursePricingSchema.index({ isActive: 1 });
coursePricingSchema.index({ instituteId: 1, isActive: 1 });
coursePricingSchema.index({ courseId: 1, isActive: 1 });

// Static method to find by course
coursePricingSchema.statics.findByCourse = function (courseId: string) {
  return this.findOne({ courseId, isActive: true })
    .populate("courseId", "name description")
    .populate("instituteId", "instituteName");
};

// Instance method to calculate pricing
coursePricingSchema.methods.calculatePrice = function (
  quantity: number = 1,
  discountCode?: string,
  pricingTier?: string
) {
  let baseAmount = 0;
  let discountAmount = 0;

  // Calculate base amount based on pricing model
  if (this.pricingModel === PricingModel.FREE) {
    baseAmount = 0;
  } else if (
    this.pricingModel === PricingModel.ALREADY_PAID ||
    this.pricingModel === PricingModel.SUBSCRIPTION
  ) {
    baseAmount = this.basePrice || 0;
  }

  // Apply tier pricing if applicable
  if (pricingTier && this.tiers && this.tiers.length > 0) {
    const tier = this.tiers.find((t: any) => t.name === pricingTier);
    if (tier) {
      baseAmount = tier.price;
    }
  }

  // Apply quantity
  baseAmount *= quantity;

  // Apply discounts if applicable
  if (discountCode && this.discounts) {
    const discount = this.discounts.find(
      (d: any) =>
        d.name === discountCode &&
        d.isActive &&
        new Date() >= d.startDate &&
        (!d.endDate || new Date() <= d.endDate) &&
        quantity >= (d.minQuantity || 1)
    );

    if (discount) {
      if (discount.type === "PERCENTAGE") {
        discountAmount = (baseAmount * discount.value) / 100;
      } else if (discount.type === "FIXED_AMOUNT") {
        discountAmount = discount.value;
      }
    }
  }

  // Calculate tax
  const subtotal = baseAmount - discountAmount;
  let taxAmount = 0;
  if (this.taxRate && !this.taxIncluded) {
    taxAmount = (subtotal * this.taxRate) / 100;
  }

  const finalAmount = subtotal + taxAmount;

  return {
    baseAmount,
    discountAmount,
    taxAmount,
    finalAmount,
    currency: this.currency,
    breakdown: {
      basePrice: this.basePrice || 0,
      appliedDiscounts: discountCode
        ? [
            {
              name: discountCode,
              discountAmount,
            },
          ]
        : [],
      tax: {
        rate: this.taxRate || 0,
        amount: taxAmount,
        included: this.taxIncluded,
      },
    },
  };
};

// Instance method to check trial availability
coursePricingSchema.methods.isTrialAvailable = function () {
  return false; // Simplified for now - can be enhanced later
};

// Instance method to check refund eligibility
coursePricingSchema.methods.isRefundAllowed = function (enrollmentDate: Date) {
  if (!this.refundPolicy.allowRefund) {
    return false;
  }

  const refundWindowDays = this.refundPolicy.refundWindowDays || 30;
  const refundDeadline = new Date(enrollmentDate);
  refundDeadline.setDate(refundDeadline.getDate() + refundWindowDays);

  return new Date() <= refundDeadline;
};

export const CoursePricing = model<ICoursePricing>(
  "CoursePricing",
  coursePricingSchema
);

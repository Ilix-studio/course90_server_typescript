import { PackageType, PricingModel, CurrencyCode } from "../constants/enums";

// Course Pricing Interface
export interface ICoursePricing {
  courseId: string;
  instituteId: string;
  pricingModel: PricingModel;
  currency: CurrencyCode;
  basePrice: number;
  subscriptionDuration?: number;
  taxRate?: number;
  taxIncluded: boolean;
  isActive: boolean;
  createdBy: string;
  createdByModel: string;
  updatedBy: string;
  updatedAt: Date;
}

// Student Enrollment Interface
export interface IStudentEnrollment {
  passkeyId: string;
  courseId: string;
  instituteId: string;
  studentId: string;
  amountPaid: number;
  currency: CurrencyCode;
  paymentMethod: string;
  paymentId: string;
  enrolledAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  metadata: {
    refundRequested?: boolean;
    refundRequestDate?: Date;
    refundReason?: string;
    [key: string]: any;
  };
}

// API Request Types
export interface CreateCoursePricingRequest {
  courseId: string;
  pricingModel: PricingModel;
  currency?: CurrencyCode;
  basePrice?: number;
  subscriptionDuration?: number;
  taxRate?: number;
  taxIncluded?: boolean;
}

export interface UpdateCoursePricingRequest
  extends CreateCoursePricingRequest {}

export interface CalculatePricingRequest {
  courseId: string;
  pricingModel?: PricingModel;
  quantity?: number;
  duration?: number;
}

export interface EnrollStudentRequest {
  courseId: string;
  passkeyId: string;
  deviceId: string;
}

// Enhanced Package Subscription Model
export interface IEnhancedPackageSubscription {
  instituteId: string;
  packageType: PackageType;

  // Platform fee tracking
  platformFeePerStudent: number; // Fixed ₹90
  setupPaymentCompleted: boolean; // For PAY_AND_GENERATE month 1
  currentMonth: number;

  // Institute's course pricing (for reference only)
  instituteCoursePrice?: {
    amount: number;
    model: "MONTHLY" | "SEMESTER" | "YEARLY" | "ONE_TIME";
    collectionMethod: "OFFLINE" | "ONLINE";
    description: string;
  };

  // Statistics
  totalActiveStudents: number;
  monthlyPlatformRevenue: number; // Our revenue (₹90 × active students)
  estimatedInstituteRevenue: number; // Institute's course revenue (for analytics)

  // Student payment tracking
  studentsWhoHavePaid: {
    studentId: string;
    monthsPaid: number[];
    lastPaymentDate: Date;
  }[];
}

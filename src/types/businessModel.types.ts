import { PackageType } from "../constants/enums";

export interface IBusinessModel {
  // Platform revenue (our income)
  passkeyPrice: number; // Fixed ₹90 per student per month
  platformMonthlyRevenue: number; // Total platform revenue per month

  // Institute revenue (their income)
  coursePricing: {
    model: "MONTHLY" | "ONE_TIME" | "SEMESTER";
    amount: number;
    collectionMethod: "OFFLINE" | "ONLINE";
    frequency: string;
  };

  // Combined model
  totalStudentCost: number; // Platform fee + Course fee
  valueProposition: string;
}

// Updated Package Configuration
export const UPDATED_PACKAGE_PRICING = {
  [PackageType.NO_HEADACHE]: {
    name: "No Headache Package",
    description:
      "Students pay platform fee directly, institute collects course fees separately",

    // Platform fee structure
    platformFee: {
      amount: 90, // Fixed ₹90 per student per month
      frequency: "MONTHLY",
      paidBy: "STUDENT",
      paymentMethod: "ONLINE",
    },

    // Institute course fee structure
    courseFee: {
      amount: "INSTITUTE_DEFINED", // Institute sets their own price
      frequency: "INSTITUTE_DEFINED", // Monthly/Semester/One-time
      paidBy: "STUDENT",
      paymentMethod: "OFFLINE", // Institute collects directly
      collectionTiming: "ADMISSION_TIME",
    },

    // Revenue flow
    revenueFlow: {
      month1: "Student pays ₹90 to Platform + Course fee to Institute",
      ongoing:
        "Student pays ₹90 to Platform monthly + Course fee to Institute (as per institute's model)",
    },

    features: [
      "₹90/month platform fee per student",
      "Institute sets their own course pricing",
      "Institute collects course fees offline",
      "No setup cost for institute",
      "Instant passkey activation",
      "Mobile app access for students",
    ],
  },

  [PackageType.PAY_AND_GENERATE]: {
    name: "Pay and Generate Package",
    description: "Institute pays first month platform fee, then students pay",

    // Platform fee structure
    platformFee: {
      amount: 90,
      frequency: "MONTHLY",
      paidBy: "INSTITUTE_MONTH_1_THEN_STUDENTS",
      paymentMethod: "ONLINE",
    },

    // Institute course fee structure
    courseFee: {
      amount: "INSTITUTE_DEFINED",
      frequency: "INSTITUTE_DEFINED",
      paidBy: "STUDENT",
      paymentMethod: "OFFLINE",
      collectionTiming: "ADMISSION_TIME",
    },

    // Revenue flow
    revenueFlow: {
      month1:
        "Institute pays ₹90 to Platform + Institute collects course fees offline",
      ongoing: "Students pay ₹90 to Platform monthly + Course fee to Institute",
    },

    features: [
      "₹90 setup fee for first month",
      "Students pay ₹90/month from month 2",
      "Institute sets their own course pricing",
      "Institute collects course fees offline",
      "Web dashboard + Mobile app",
      "Bulk passkey generation",
    ],
  },
};

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

// Updated Passkey Model
export interface IEnhancedPasskey {
  passkeyId: string;
  instituteId: string;
  courseId: string;
  packageType: PackageType;

  // Platform fee structure
  platformFee: {
    amount: 90;
    frequency: "MONTHLY";
    nextPaymentDue: Date;
    isPaid: boolean;
    paidBy: "INSTITUTE" | "STUDENT";
  };

  // Institute course access (separate from platform fee)
  courseAccess: {
    hasAccess: boolean;
    accessVerifiedBy: "INSTITUTE" | "SYSTEM";
    verificationMethod: "OFFLINE_PAYMENT" | "MANUAL_APPROVAL";
    notes?: string;
  };

  // Student assignment
  assignedStudent?: {
    studentId: string;
    deviceId: string;
    activatedAt: Date;
    expiresAt: Date;
  };

  status:
    | "GENERATED"
    | "STUDENT_ASSIGNED"
    | "PLATFORM_FEE_PAID"
    | "FULLY_ACTIVE"
    | "EXPIRED";
}

// Updated Business Model Calculator
export class BusinessModelCalculator {
  private platformFeePerStudent = 90;

  // Calculate revenue for NO_HEADACHE package
  calculateNoHeadacheRevenue(
    studentsCount: number,
    instituteCourseFee: number
  ) {
    return {
      // Platform revenue (our income)
      platformRevenue: {
        perStudent: this.platformFeePerStudent,
        totalMonthly: studentsCount * this.platformFeePerStudent,
        yearly: studentsCount * this.platformFeePerStudent * 12,
      },

      // Institute revenue (their income)
      instituteRevenue: {
        perStudent: instituteCourseFee,
        totalRevenue: studentsCount * instituteCourseFee,
        collectionMethod: "OFFLINE",
      },

      // Student cost breakdown
      studentCosts: {
        platformFee: this.platformFeePerStudent,
        courseFee: instituteCourseFee,
        totalPerStudent: this.platformFeePerStudent + instituteCourseFee,
      },

      // Monthly cash flow
      monthlyFlow: {
        studentsPayPlatform: studentsCount * this.platformFeePerStudent,
        studentsPayInstitute: studentsCount * instituteCourseFee,
        institutePaysUs: 0,
      },
    };
  }

  // Calculate revenue for PAY_AND_GENERATE package
  calculatePayAndGenerateRevenue(
    studentsCount: number,
    instituteCourseFee: number,
    currentMonth: number
  ) {
    if (currentMonth === 1) {
      // Month 1: Institute pays us
      return {
        platformRevenue: {
          fromInstitute: this.platformFeePerStudent, // Institute pays ₹90 setup
          fromStudents: 0,
          total: this.platformFeePerStudent,
        },

        instituteRevenue: {
          fromStudents: studentsCount * instituteCourseFee,
          platformCost: this.platformFeePerStudent,
          netRevenue:
            studentsCount * instituteCourseFee - this.platformFeePerStudent,
        },

        studentCosts: {
          platformFee: 0, // Free for students in month 1
          courseFee: instituteCourseFee,
          totalPerStudent: instituteCourseFee,
        },

        monthlyFlow: {
          studentsPayPlatform: 0,
          studentsPayInstitute: studentsCount * instituteCourseFee,
          institutePaysUs: this.platformFeePerStudent,
        },
      };
    } else {
      // Month 2+: Students pay us
      return {
        platformRevenue: {
          fromInstitute: 0,
          fromStudents: studentsCount * this.platformFeePerStudent,
          total: studentsCount * this.platformFeePerStudent,
        },

        instituteRevenue: {
          fromStudents: studentsCount * instituteCourseFee,
          platformCost: 0,
          netRevenue: studentsCount * instituteCourseFee,
        },

        studentCosts: {
          platformFee: this.platformFeePerStudent,
          courseFee: instituteCourseFee,
          totalPerStudent: this.platformFeePerStudent + instituteCourseFee,
        },

        monthlyFlow: {
          studentsPayPlatform: studentsCount * this.platformFeePerStudent,
          studentsPayInstitute: studentsCount * instituteCourseFee,
          institutePaysUs: 0,
        },
      };
    }
  }
}

// Example calculations
const calculator = new BusinessModelCalculator();

// Example: Institute with 100 students, charges ₹2000/month course fee
const exampleCalculations = {
  // NO_HEADACHE Package
  noHeadache: calculator.calculateNoHeadacheRevenue(100, 2000),

  // PAY_AND_GENERATE Package
  payAndGenerateMonth1: calculator.calculatePayAndGenerateRevenue(100, 2000, 1),
  payAndGenerateMonth2Plus: calculator.calculatePayAndGenerateRevenue(
    100,
    2000,
    2
  ),
};
export interface EnrollmentPaymentRequest {
  courseId: string;
  passkeyId: string;
  deviceId: string;
  durationMonths?: number;
}

export interface CourseAccessVerification {
  passkeyId: string;
  courseId: string;
  deviceId: string;
}

export interface PaymentLinkRequest {
  passkeyId: string;
  paymentId: string;
}
/*
  EXAMPLE RESULTS:
  
  NO_HEADACHE Package (100 students, ₹2000 course fee): + Add Tax 
  - Platform Revenue: ₹9,000/month (100 × ₹90)
  - Institute Revenue: ₹2,00,000/month (100 × ₹2000)
  - Student Cost: ₹2,090 per student (₹90 platform + ₹2000 course)
  
  PAY_AND_GENERATE Package:
  Month 1:
  - Platform Revenue: ₹90 (from institute)
  - Institute Revenue: ₹2,00,000 - ₹90 = ₹1,99,910
  - Student Cost: ₹2,000 per student (only course fee)
  
  Month 2+:
  - Platform Revenue: ₹9,000/month (100 × ₹90)
  - Institute Revenue: ₹2,00,000/month (100 × ₹2000)
  - Student Cost: ₹2,090 per student (₹90 platform + ₹2000 course)
  */

export { exampleCalculations };

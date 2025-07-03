// Enums for roles and permissions
export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN", // You (system owner)
  PRINCIPAL = "PRINCIPAL", // Institute owner/admin
  TEACHER = "TEACHER", // Teacher hired by institute
}

export enum InstituteType {
  SENIOR_SECONDARY = "SENIOR_SECONDARY",
  COACHING = "COACHING",
  UNIVERSITY = "UNIVERSITY",
}

export enum PricingModel {
  FREE = "FREE",
  ALREADY_PAID = "ALREADY_PAID", // Generate for one month then user continue from next month) = Pay and Gennerate Model) Pay for 1 month(institute)
  SUBSCRIPTION = "SUBSCRIPTION", // (subscription + course price) = No Headache Model
}

export enum CurrencyCode {
  INR = "INR",
  USD = "USD",
  EUR = "EUR",
}

export enum PackageType {
  NO_HEADACHE = "NO_HEADACHE", // Mobile app with Razorpay
  PAY_AND_GENERATE = "PAY_AND_GENERATE", // Web app + Mobile App with Razorpay
}

export enum RevenueType {
  PLATFORM_FEE = "PLATFORM_FEE", // ₹90 for passkey/platform access
  COURSE_FEE = "COURSE_FEE", // Institute's course price (offline)
}

// Represents the status of a payment in the system
export enum PaymentStatus {
  CREATED = "CREATED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum PaymentType {
  COURSE_FEE = "COURSE_FEE",
  PLATFORM_FEE = "PLATFORM_FEE",
  COMBINED = "COMBINED",
  SETUP_FEE = "SETUP_FEE",
}
// Represents the possible statuses of a passkey in the system
export enum PasskeyStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
  REVIVE = "REVIVE",
  GENERATED = "GENERATED",
  STUDENT_ASSIGNED = "STUDENT_ASSIGNED",
  PLATFORM_FEE_PENDING = "PLATFORM_FEE_PENDING", // Student needs to pay ₹90
  PLATFORM_FEE_PAID = "PLATFORM_FEE_PAID", // Student paid ₹90 platform fee
  COURSE_ACCESS_PENDING = "COURSE_ACCESS_PENDING", // Institute needs to verify course payment
  FULLY_ACTIVE = "FULLY_ACTIVE", // Both platform fee and course access confirmed
}

// Duration options for passkey validity period (in months)
export enum PasskeyDuration {
  ONE_MONTH = 1,
  TWELVE_MONTHS = 12,
}
// Pricing for each passkey duration (in Rupees)
export const PASSKEY_PRICING = {
  [PasskeyDuration.ONE_MONTH]: 90,
  [PasskeyDuration.TWELVE_MONTHS]: 990,
};

// Maximum number of passkeys an institute can generate at once
export const MAX_PASSKEY_GENERATION_COUNT = 90;

// Length of generated passkey IDs
export const PASSKEY_ID_LENGTH = 10;

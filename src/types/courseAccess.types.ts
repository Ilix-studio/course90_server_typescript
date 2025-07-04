``; // Course Access Interface
export interface ICourseAccess {
  passkeyId: string;
  courseId: string;
  studentId: string;
  deviceIds: string[]; // Support for multiple devices
  hasAccess: boolean;
  accessStartDate: Date;
  accessEndDate?: Date;
  isActive: boolean;
  paymentId: string;
  lastAccessedAt?: Date;
  accessCount: number;
}

// API Request Types
export interface CheckCourseAccessRequest {
  passkeyId: string;
  courseId: string;
  deviceId: string;
}

export interface EnrollStudentRequest {
  courseId: string;
  passkeyId: string;
  paymentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  deviceId: string;
}

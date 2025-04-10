// Represents the status of a payment in the system
export enum PaymentStatus {
  CREATED = "CREATED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}
// Represents the possible statuses of a passkey in the system
export enum PasskeyStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
  REVIVE = "REVIVE",
}

export enum InstituteType {
  COACHING = "COACHING",
  SCHOOL = "SCHOOL",
  // TUTOR = "TUTOR"
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
export const MAX_PASSKEY_GENERATION_COUNT = 70;

// Length of generated passkey IDs
export const PASSKEY_ID_LENGTH = 10;

// Pay-Per-Use Consumption Model

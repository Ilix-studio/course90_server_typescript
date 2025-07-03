// utils/smsService.ts
import twilio from "twilio";

interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

class SMSService {
  private client: twilio.Twilio | null = null;
  private fromNumber: string = "";
  private isConfigured: boolean = false;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn(
        "⚠️  Twilio credentials not found. SMS functionality will be disabled."
      );
      console.warn(
        "📧 Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER environment variables to enable SMS."
      );
      this.isConfigured = false;
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      this.fromNumber = fromNumber;
      this.isConfigured = true;
      console.log("✅ Twilio SMS service initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Twilio client:", error);
      this.isConfigured = false;
    }
  }

  private checkConfiguration(): void {
    if (!this.isConfigured || !this.client) {
      throw new Error(
        "SMS service is not configured. Please set Twilio environment variables."
      );
    }
  }

  /**
   * Send SMS to a single phone number
   */
  async sendSMS(to: string, message: string): Promise<string> {
    this.checkConfiguration();

    try {
      // Format phone number for Indian numbers
      const formattedNumber = this.formatPhoneNumber(to);

      const result = await this.client!.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedNumber,
      });

      console.log(
        `SMS sent successfully to ${formattedNumber}. SID: ${result.sid}`
      );
      return result.sid;
    } catch (error: any) {
      console.error("Failed to send SMS:", error);
      throw new Error(`SMS sending failed: ${error.message}`);
    }
  }

  /**
   * Send bulk SMS to multiple phone numbers
   */
  async sendBulkSMS(
    numbers: string[],
    message: string
  ): Promise<{ successful: string[]; failed: string[] }> {
    this.checkConfiguration();

    const successful: string[] = [];
    const failed: string[] = [];

    const promises = numbers.map(async (number) => {
      try {
        await this.sendSMS(number, message);
        successful.push(number);
      } catch (error) {
        failed.push(number);
        console.error(`Failed to send SMS to ${number}:`, error);
      }
    });

    await Promise.allSettled(promises);

    return { successful, failed };
  }

  /**
   * Send teacher credentials via SMS
   */
  async sendTeacherCredentials(
    phoneNumber: string,
    instituteName: string,
    applicationId: string,
    password: string
  ): Promise<string> {
    const message = `Welcome to ${instituteName}!

Your Login Credentials:
📱 Application ID: ${applicationId}
🔐 Password: ${password}

Please keep these credentials secure and change your password after first login.

Login at: [Your App URL]

For support, contact your institute administrator.`;

    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send password reset SMS
   */
  async sendPasswordReset(
    phoneNumber: string,
    instituteName: string,
    applicationId: string,
    newPassword: string
  ): Promise<string> {
    const message = `${instituteName} - Password Reset

Your password has been reset successfully.

📱 Application ID: ${applicationId}
🔐 New Password: ${newPassword}

Please login and change this password immediately for security.

If you didn't request this reset, contact your administrator immediately.`;

    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send passkey information via SMS
   */
  async sendPasskeyInfo(
    phoneNumber: string,
    instituteName: string,
    passkeyId: string,
    courseName: string,
    expiryDate: Date
  ): Promise<string> {
    const message = `${instituteName} - Course Access

Your course passkey is ready!

📚 Course: ${courseName}
🔑 Passkey: ${passkeyId}
📅 Valid until: ${expiryDate.toLocaleDateString("en-IN")}

Download our app and use this passkey to access your course materials.

Happy Learning!`;

    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send payment confirmation SMS
   */
  async sendPaymentConfirmation(
    phoneNumber: string,
    instituteName: string,
    amount: number,
    passkeyId: string,
    courseName: string
  ): Promise<string> {
    const message = `${instituteName} - Payment Confirmed

Thank you for your payment!

💰 Amount: ₹${amount}
📚 Course: ${courseName}
🔑 Passkey: ${passkeyId}

Your course access is now active. Start learning immediately!

For support: Contact your institute`;

    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send course reminder SMS
   */
  async sendCourseReminder(
    phoneNumber: string,
    instituteName: string,
    courseName: string,
    daysLeft: number
  ): Promise<string> {
    const message = `${instituteName} - Course Reminder

Your course access expires in ${daysLeft} days!

📚 Course: ${courseName}

Renew now to continue learning without interruption.

Contact your institute for renewal options.`;

    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Format phone number for Indian numbers
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    let formatted = phoneNumber.replace(/\D/g, "");

    // Handle Indian phone numbers
    if (formatted.length === 10) {
      // Add India country code
      formatted = "+91" + formatted;
    } else if (formatted.length === 12 && formatted.startsWith("91")) {
      // Add + sign
      formatted = "+" + formatted;
    } else if (formatted.length === 13 && formatted.startsWith("+91")) {
      // Already formatted
      return formatted;
    } else {
      // For other countries or invalid numbers
      if (!formatted.startsWith("+")) {
        formatted = "+" + formatted;
      }
    }

    return formatted;
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    // Remove all non-numeric characters
    const numeric = phoneNumber.replace(/\D/g, "");

    // Check for valid Indian mobile number (10 digits) or international format
    if (numeric.length === 10) {
      // Indian mobile numbers start with 6, 7, 8, or 9
      return /^[6-9]\d{9}$/.test(numeric);
    } else if (numeric.length >= 10 && numeric.length <= 15) {
      // International format
      return true;
    }

    return false;
  }

  /**
   * Get SMS delivery status
   */
  async getSMSStatus(messageSid: string): Promise<any> {
    this.checkConfiguration();

    try {
      const message = await this.client!.messages(messageSid).fetch();
      return {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
      };
    } catch (error: any) {
      console.error("Failed to fetch SMS status:", error);
      throw new Error(`Failed to get SMS status: ${error.message}`);
    }
  }

  /**
   * Check if SMS service is configured and ready to use
   */
  isReady(): boolean {
    return this.isConfigured;
  }
}

// Create and export singleton instance
const smsService = new SMSService();

// Export convenience functions with safety checks
export const sendSMS = (to: string, message: string) => {
  if (!smsService.isReady()) {
    console.warn("SMS service not configured. Message not sent to:", to);
    return Promise.resolve("SMS_DISABLED");
  }
  return smsService.sendSMS(to, message);
};

export const sendBulkSMS = (numbers: string[], message: string) => {
  if (!smsService.isReady()) {
    console.warn(
      "SMS service not configured. Bulk message not sent to:",
      numbers.length,
      "numbers"
    );
    return Promise.resolve({ successful: [], failed: numbers });
  }
  return smsService.sendBulkSMS(numbers, message);
};

export const sendTeacherCredentials = (
  phoneNumber: string,
  instituteName: string,
  applicationId: string,
  password: string
) => {
  if (!smsService.isReady()) {
    console.warn(
      "SMS service not configured. Teacher credentials not sent to:",
      phoneNumber
    );
    return Promise.resolve("SMS_DISABLED");
  }
  return smsService.sendTeacherCredentials(
    phoneNumber,
    instituteName,
    applicationId,
    password
  );
};

export const sendPasswordReset = (
  phoneNumber: string,
  instituteName: string,
  applicationId: string,
  newPassword: string
) => {
  if (!smsService.isReady()) {
    console.warn(
      "SMS service not configured. Password reset SMS not sent to:",
      phoneNumber
    );
    return Promise.resolve("SMS_DISABLED");
  }
  return smsService.sendPasswordReset(
    phoneNumber,
    instituteName,
    applicationId,
    newPassword
  );
};

export const sendPasskeyInfo = (
  phoneNumber: string,
  instituteName: string,
  passkeyId: string,
  courseName: string,
  expiryDate: Date
) => {
  if (!smsService.isReady()) {
    console.warn(
      "SMS service not configured. Passkey info not sent to:",
      phoneNumber
    );
    return Promise.resolve("SMS_DISABLED");
  }
  return smsService.sendPasskeyInfo(
    phoneNumber,
    instituteName,
    passkeyId,
    courseName,
    expiryDate
  );
};

export const sendPaymentConfirmation = (
  phoneNumber: string,
  instituteName: string,
  amount: number,
  passkeyId: string,
  courseName: string
) => {
  if (!smsService.isReady()) {
    console.warn(
      "SMS service not configured. Payment confirmation not sent to:",
      phoneNumber
    );
    return Promise.resolve("SMS_DISABLED");
  }
  return smsService.sendPaymentConfirmation(
    phoneNumber,
    instituteName,
    amount,
    passkeyId,
    courseName
  );
};

export const sendCourseReminder = (
  phoneNumber: string,
  instituteName: string,
  courseName: string,
  daysLeft: number
) => {
  if (!smsService.isReady()) {
    console.warn(
      "SMS service not configured. Course reminder not sent to:",
      phoneNumber
    );
    return Promise.resolve("SMS_DISABLED");
  }
  return smsService.sendCourseReminder(
    phoneNumber,
    instituteName,
    courseName,
    daysLeft
  );
};

export const isValidPhoneNumber = (phoneNumber: string) =>
  smsService.isValidPhoneNumber(phoneNumber);

export const getSMSStatus = (messageSid: string) => {
  if (!smsService.isReady()) {
    throw new Error("SMS service not configured");
  }
  return smsService.getSMSStatus(messageSid);
};

export default smsService;

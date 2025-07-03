// controllers/payment/razorpayService.ts
import Razorpay from "razorpay";
import crypto from "crypto";

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

// Interfaces for type safety
export interface CreateOrderRequest {
  amount: number; // Amount in rupees
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface VerifyPaymentRequest {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  offer_id: string | null;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

// Simple logger for Razorpay operations
const logger = {
  info: (message: string, data?: any) => {
    console.log(
      `[RAZORPAY INFO] ${message}`,
      data ? JSON.stringify(data, null, 2) : ""
    );
  },
  error: (message: string, error?: any) => {
    console.error(`[RAZORPAY ERROR] ${message}`, error);
  },
  warn: (message: string, data?: any) => {
    console.warn(
      `[RAZORPAY WARN] ${message}`,
      data ? JSON.stringify(data, null, 2) : ""
    );
  },
};

/**
 * Create a Razorpay order
 * @param orderData - Order creation data
 * @returns Promise<RazorpayOrder>
 */
export const createRazorpayOrder = async (
  orderData: CreateOrderRequest
): Promise<RazorpayOrder> => {
  try {
    // Validate input
    if (!orderData.amount || orderData.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    if (!orderData.currency) {
      throw new Error("Currency is required");
    }

    if (!orderData.receipt) {
      throw new Error("Receipt is required");
    }

    // Convert amount to paisa (Razorpay expects amount in smallest currency unit)
    const amountInPaisa = Math.round(orderData.amount * 100);

    const options = {
      amount: amountInPaisa,
      currency: orderData.currency.toUpperCase(),
      receipt: orderData.receipt,
      notes: orderData.notes || {},
    };

    logger.info("Creating Razorpay order", { options });

    const order = await razorpay.orders.create(options);

    logger.info("Razorpay order created successfully", {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });

    return order as RazorpayOrder;
  } catch (error: any) {
    logger.error("Failed to create Razorpay order", error);

    // Handle specific Razorpay errors
    if (error.statusCode) {
      switch (error.statusCode) {
        case 400:
          throw new Error(
            `Invalid request: ${error.error?.description || error.message}`
          );
        case 401:
          throw new Error(
            "Authentication failed. Please check Razorpay credentials"
          );
        case 500:
          throw new Error("Razorpay server error. Please try again later");
        default:
          throw new Error(
            `Razorpay error: ${error.error?.description || error.message}`
          );
      }
    }

    throw new Error(`Order creation failed: ${error.message}`);
  }
};

/**
 * Verify Razorpay payment signature
 * @param paymentData - Payment verification data
 * @returns Promise<boolean>
 */
export const verifyRazorpayPayment = async (
  paymentData: VerifyPaymentRequest
): Promise<boolean> => {
  try {
    // Validate input
    if (
      !paymentData.orderId ||
      !paymentData.paymentId ||
      !paymentData.signature
    ) {
      throw new Error(
        "Order ID, Payment ID, and Signature are required for verification"
      );
    }

    // Create the verification string
    const text = `${paymentData.orderId}|${paymentData.paymentId}`;

    // Get Razorpay secret key
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      throw new Error("Razorpay key secret not configured");
    }

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(text)
      .digest("hex");

    logger.info("Verifying payment signature", {
      orderId: paymentData.orderId,
      paymentId: paymentData.paymentId,
      providedSignature: paymentData.signature,
      expectedSignature,
    });

    // Compare signatures
    const isValid = expectedSignature === paymentData.signature;

    if (isValid) {
      logger.info("Payment signature verified successfully", {
        orderId: paymentData.orderId,
        paymentId: paymentData.paymentId,
      });
    } else {
      logger.warn("Payment signature verification failed", {
        orderId: paymentData.orderId,
        paymentId: paymentData.paymentId,
        expectedSignature,
        providedSignature: paymentData.signature,
      });
    }

    return isValid;
  } catch (error: any) {
    logger.error("Payment verification failed", error);
    throw new Error(`Payment verification failed: ${error.message}`);
  }
};

/**
 * Fetch payment details from Razorpay
 * @param paymentId - Razorpay payment ID
 * @returns Promise<any>
 */
export const fetchPaymentDetails = async (paymentId: string): Promise<any> => {
  try {
    if (!paymentId) {
      throw new Error("Payment ID is required");
    }

    logger.info("Fetching payment details", { paymentId });

    const payment = await razorpay.payments.fetch(paymentId);

    logger.info("Payment details fetched successfully", {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
    });

    return payment;
  } catch (error: any) {
    logger.error("Failed to fetch payment details", error);

    if (error.statusCode === 404) {
      throw new Error("Payment not found");
    }

    throw new Error(`Failed to fetch payment details: ${error.message}`);
  }
};

/**
 * Fetch order details from Razorpay
 * @param orderId - Razorpay order ID
 * @returns Promise<any>
 */
export const fetchOrderDetails = async (orderId: string): Promise<any> => {
  try {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    logger.info("Fetching order details", { orderId });

    const order = await razorpay.orders.fetch(orderId);

    logger.info("Order details fetched successfully", {
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
    });

    return order;
  } catch (error: any) {
    logger.error("Failed to fetch order details", error);

    if (error.statusCode === 404) {
      throw new Error("Order not found");
    }

    throw new Error(`Failed to fetch order details: ${error.message}`);
  }
};

/**
 * Create a refund for a payment
 * @param paymentId - Razorpay payment ID
 * @param amount - Refund amount in rupees (optional, full refund if not provided)
 * @param notes - Additional notes for the refund
 * @returns Promise<any>
 */
export const createRefund = async (
  paymentId: string,
  amount?: number,
  notes?: Record<string, string>
): Promise<any> => {
  try {
    if (!paymentId) {
      throw new Error("Payment ID is required");
    }

    const refundData: any = {
      notes: notes || {},
    };

    // If amount is provided, convert to paisa
    if (amount && amount > 0) {
      refundData.amount = Math.round(amount * 100);
    }

    logger.info("Creating refund", { paymentId, refundData });

    const refund = await razorpay.payments.refund(paymentId, refundData);

    logger.info("Refund created successfully", {
      refundId: refund.id,
      paymentId: refund.payment_id,
      amount: refund.amount,
      status: refund.status,
    });

    return refund;
  } catch (error: any) {
    logger.error("Failed to create refund", error);

    if (error.statusCode === 400) {
      throw new Error(
        `Invalid refund request: ${error.error?.description || error.message}`
      );
    }

    throw new Error(`Refund creation failed: ${error.message}`);
  }
};

/**
 * Fetch refund details
 * @param paymentId - Razorpay payment ID
 * @param refundId - Razorpay refund ID
 * @returns Promise<any>
 */
export const fetchRefundDetails = async (
  paymentId: string,
  refundId: string
): Promise<any> => {
  try {
    if (!paymentId || !refundId) {
      throw new Error("Payment ID and Refund ID are required");
    }

    logger.info("Fetching refund details", { paymentId, refundId });

    const refund = await razorpay.payments.fetchRefund(paymentId, refundId);

    logger.info("Refund details fetched successfully", {
      refundId: refund.id,
      paymentId: refund.payment_id,
      amount: refund.amount,
      status: refund.status,
    });

    return refund;
  } catch (error: any) {
    logger.error("Failed to fetch refund details", error);

    if (error.statusCode === 404) {
      throw new Error("Refund not found");
    }

    throw new Error(`Failed to fetch refund details: ${error.message}`);
  }
};

/**
 * Validate Razorpay webhook signature
 * @param body - Webhook request body
 * @param signature - Webhook signature from headers
 * @param secret - Webhook secret
 * @returns boolean
 */
export const verifyWebhookSignature = (
  body: string,
  signature: string,
  secret: string
): boolean => {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    return expectedSignature === signature;
  } catch (error: any) {
    logger.error("Webhook signature verification failed", error);
    return false;
  }
};

/**
 * Get Razorpay configuration for frontend
 * @returns object
 */
export const getRazorpayConfig = () => {
  return {
    key_id: process.env.RAZORPAY_KEY_ID,
    currency: "INR",
    theme: {
      color: "#3399cc",
    },
    modal: {
      ondismiss: () => {
        console.log("Payment cancelled by user");
      },
    },
  };
};

// Export Razorpay instance for direct use if needed
export { razorpay };

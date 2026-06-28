/**
 * Razorpay TypeScript Type Definitions
 */

export interface RazorpayOptions {
  key: string;
  amount: number; // in paise
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayPaymentResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  notes?: Record<string, string>;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

export interface CreateOrderResponse {
  success: boolean;
  orderId: string;
  amount: number; // in paise
  currency: string;
  paymentId: number;
  key: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  paymentId: number;
}

export interface PaymentSuccessResponse {
  success: boolean;
  songId: number;
  message: string;
}


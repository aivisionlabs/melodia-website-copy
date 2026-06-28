/**
 * Generic Payment Types
 * Provider-agnostic payment types
 */

export interface PaymentOrderResponse {
  success: boolean;
  orderId: string;
  amount: number; // in smallest currency unit
  currency: string;
  paymentId: number;
  provider: 'razorpay' | 'cashfree';
  providerData: {
    key?: string; // Razorpay
    appId?: string; // Cashfree
    sessionId?: string; // Cashfree
    checkoutUrl?: string; // Cashfree redirect
    [key: string]: any;
  };
}

export interface PaymentVerifyResponse {
  success: boolean;
  message: string;
  paymentId: number;
}

export interface PaymentCheckoutOptions {
  // Common options
  amount: number;
  currency: string;
  orderId: string;
  name: string;
  description: string;
  handler: (response: PaymentResponse) => void;
  onCancel?: () => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  // Provider-specific options
  providerData?: {
    key?: string; // Razorpay
    appId?: string; // Cashfree
    sessionId?: string; // Cashfree
    checkoutUrl?: string; // Cashfree redirect
    [key: string]: any;
  };
}

export interface PaymentResponse {
  paymentId: string;
  orderId: string;
  signature: string;
  [key: string]: any;
}

export interface PaymentSuccessResponse {
  success: boolean;
  songId?: number;
  message: string;
  isPrimeCustomer?: boolean;
}

/** Convert create-order response amount (paise) to INR for analytics/display */
export function paymentOrderAmountInr(
  order: Pick<PaymentOrderResponse, "amount">,
): number {
  return order.amount / 100;
}


/**
 * Payment Provider Types
 * Common interfaces for all payment providers
 */

export type PaymentProviderType = 'razorpay' | 'cashfree';

export interface CreateOrderRequest {
  amount: number; // in rupees
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
  customerDetails?: {
    customerId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  };
  returnUrl?: string; // For redirect checkout (Cashfree)
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number; // in smallest currency unit (paise for INR)
  currency: string;
  // Provider-specific fields
  providerData: {
    key?: string; // Razorpay key
    appId?: string; // Cashfree app ID
    sessionId?: string; // Cashfree session ID
    checkoutUrl?: string; // Cashfree redirect URL
    [key: string]: any; // Allow provider-specific fields
  };
}

export interface VerifyPaymentRequest {
  orderId: string;
  paymentId: string;
  signature: string;
  // Provider-specific fields
  [key: string]: any;
}

export interface VerifyPaymentResponse {
  isValid: boolean;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'completed' | 'failed' | 'pending';
}

export interface WebhookEvent {
  eventId: string;
  eventType: string;
  orderId: string;
  paymentId?: string;
  status: 'completed' | 'failed' | 'refunded' | 'pending';
  payload: any;
}

export interface PaymentProvider {
  /**
   * Get provider name
   */
  getName(): PaymentProviderType;

  /**
   * Create a payment order
   */
  createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse>;

  /**
   * Verify payment signature (for client-side callbacks)
   */
  verifyPaymentSignature(request: VerifyPaymentRequest): boolean;

  /**
   * Verify webhook signature
   * @param body - Raw request body
   * @param signature - Signature from header
   * @param timestamp - Timestamp from header (optional, required for Cashfree)
   */
  verifyWebhookSignature(
    body: string, 
    signature: string, 
    timestamp?: string
  ): Promise<boolean>;

  /**
   * Process webhook event
   */
  processWebhookEvent(payload: any): Promise<WebhookEvent>;

  /**
   * Fetch payment details
   */
  getPayment(paymentId: string): Promise<any>;

  /**
   * Fetch order details
   */
  getOrder(orderId: string): Promise<any>;

  /**
   * Create refund
   */
  createRefund(paymentId: string, amount?: number): Promise<any>;

  /**
   * Get checkout script URL (for frontend)
   */
  getCheckoutScriptUrl(): string;

  /**
   * Get checkout initialization function name (for frontend)
   */
  getCheckoutInitFunction(): string;
}


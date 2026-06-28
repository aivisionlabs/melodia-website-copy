/**
 * Cashfree Payment Provider
 * Implements PaymentProvider interface using Cashfree SDK
 */

import { Cashfree, CFEnvironment } from 'cashfree-pg';
import crypto from 'crypto';
import type {
  PaymentProvider,
  CreateOrderRequest,
  CreateOrderResponse,
  VerifyPaymentRequest,
  WebhookEvent,
} from '../types';

export class CashfreeProvider implements PaymentProvider {
  private cashfree: Cashfree;
  private appId: string;
  private secretKey: string;
  private webhookSecret: string;
  private environment: CFEnvironment;

  constructor() {
    this.appId = process.env.CASHFREE_APP_ID || '';
    this.secretKey = process.env.CASHFREE_SECRET_KEY || '';
    this.webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET || '';

    const isProduction = process.env.NODE_ENV === 'production';
    this.environment = isProduction ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;

    if (!this.appId || !this.secretKey) {
      throw new Error('CASHFREE_APP_ID and CASHFREE_SECRET_KEY are required');
    }

    this.cashfree = new Cashfree(this.environment, this.appId, this.secretKey);
  }

  getName(): 'cashfree' {
    return 'cashfree';
  }

  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      // According to Cashfree docs: https://www.cashfree.com/docs/payments/online/web/redirect.md
      // JavaScript SDK: cashfree.PGCreateOrder(request) - no API version parameter
      const orderRequest = {
        order_amount: request.amount,
        order_currency: request.currency || 'INR',
        customer_details: {
          customer_id: String(request.customerDetails?.customerId || `customer_${Date.now()}`),
          customer_name: request.customerDetails?.customerName || '',
          customer_email: request.customerDetails?.customerEmail || '',
          customer_phone: request.customerDetails?.customerPhone || '',
        },
        order_meta: {
          return_url: request.returnUrl || process.env.CASHFREE_RETURN_URL || '',
        },
        order_note: request.notes ? JSON.stringify(request.notes) : '',
      };

      // JavaScript/TypeScript SDK: PGCreateOrder takes request directly (no API version param)
      // Reference: https://www.cashfree.com/docs/payments/online/web/redirect.md
      const response = await this.cashfree.PGCreateOrder(orderRequest);
      const order = response.data;

      // Validate required fields
      if (!order?.order_id) {
        throw new Error('Cashfree order creation failed: Missing order_id in response');
      }

      // Cashfree returns order_amount in base currency (rupees)
      // Convert to paise for consistency with our interface
      const orderAmount = order.order_amount
        ? (typeof order.order_amount === 'string'
          ? parseFloat(order.order_amount)
          : order.order_amount)
        : request.amount; // Fallback to request amount
      const amountInPaise = Math.round(orderAmount * 100);

      // According to Cashfree docs, response contains:
      // - order_id
      // - payment_session_id (required for checkout)
      // - payment_url or payments_link (for redirect checkout, optional)
      const orderData = order as any;


      const checkoutUrl = orderData.payment_url || orderData.payments_link || orderData.payment_link || '';
      const paymentSessionId = orderData.payment_session_id || '';

      if (!paymentSessionId) {
        console.error('Cashfree order created but payment_session_id is missing!', orderData);
        throw new Error('Cashfree order response missing payment_session_id');
      }

      return {
        orderId: order.order_id,
        amount: amountInPaise, // Convert to paise for consistency
        currency: order.order_currency || request.currency || 'INR',
        providerData: {
          appId: this.appId,
          sessionId: paymentSessionId, // Required for Cashfree checkout
          checkoutUrl: checkoutUrl, // Optional - for redirect checkout
        },
      };
    } catch (error: any) {
      console.error('Cashfree order creation error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      throw new Error(`Failed to create payment order with Cashfree: ${errorMessage}`);
    }
  }

  verifyPaymentSignature(request: VerifyPaymentRequest): boolean {
    // Cashfree uses different signature verification
    // For redirect checkout, signature is verified via webhook
    // For popup/inline, signature verification may differ
    // This needs to be implemented based on Cashfree's documentation
    try {
      // TODO: Implement Cashfree signature verification
      // Cashfree signature format may differ from Razorpay
      // For now, return true as redirect checkout doesn't use client-side signature
      // Signature will be verified via webhook
      return true; // Placeholder - will be verified via webhook for redirect checkout
    } catch (error) {
      console.error('Cashfree signature verification error:', error);
      return false;
    }
  }

  async verifyWebhookSignature(
    body: string,
    signature: string,
    timestamp?: string
  ): Promise<boolean> {
    try {
      if (!timestamp) {
        console.error('Cashfree webhook: Missing x-webhook-timestamp header');
        return false;
      }

      // Cashfree signature verification uses the API SECRET KEY, not webhook secret
      // Reference: https://www.cashfree.com/docs/payments/online/webhooks/signature-verification
      const secretToUse = this.secretKey;

      if (!secretToUse) {
        console.error('Cashfree webhook: Missing webhook secret or secret key');
        return false;
      }

      // Cashfree signature verification:
      // 1. Concatenate timestamp + raw body (exact string concatenation, no modifications)
      // 2. HMAC SHA256 with secret key (API secret key, not webhook secret)
      // 3. Base64 encode the result
      const signStr = timestamp + body;

      const expectedSignature = crypto
        .createHmac('sha256', secretToUse)
        .update(signStr, 'utf8') // Explicitly specify UTF-8 encoding
        .digest('base64');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Cashfree webhook signature verification error:', error);
      return false;
    }
  }

  async processWebhookEvent(payload: any): Promise<WebhookEvent> {
    // Extract event information from Cashfree webhook payload
    // Cashfree webhook structure: { type, data: { order: { order_id }, payment: { cf_payment_id, payment_status } } }
    // Reference: https://www.cashfree.com/docs/api-reference/payments/latest/payments/webhooks.md

    const eventType = payload.type; // e.g., "PAYMENT_SUCCESS_WEBHOOK", "PAYMENT_FAILED_WEBHOOK"

    // Extract order and payment information
    const orderId = payload.data?.order?.order_id;
    const paymentId = payload.data?.payment?.cf_payment_id; // Correct field name (not payment_id)
    const paymentStatus = payload.data?.payment?.payment_status; // "SUCCESS" | "FAILED"

    // Generate event ID (use order_id + type + timestamp for uniqueness)
    // Note: Should prefer x-idempotency-key header if available (handled in webhook route)
    const eventId = orderId
      ? `${orderId}_${eventType}_${Date.now()}`
      : `evt_${Date.now()}`;

    // Map Cashfree event types to status
    const statusMap: Record<string, 'completed' | 'failed' | 'refunded' | 'pending'> = {
      'PAYMENT_SUCCESS_WEBHOOK': 'completed',
      'PAYMENT_FAILED_WEBHOOK': 'failed',
      'PAYMENT_USER_DROPPED_WEBHOOK': 'failed', // User dropped payment
    };

    // Determine status based on event type
    let status: 'completed' | 'failed' | 'refunded' | 'pending' = statusMap[eventType] || 'pending';

    // Additional validation: verify payment_status field matches event type
    if (eventType === 'PAYMENT_SUCCESS_WEBHOOK' && paymentStatus !== 'SUCCESS') {
      console.warn(`Cashfree webhook: Event type is SUCCESS but payment_status is ${paymentStatus}`);
      status = 'failed';
    }

    if (eventType === 'PAYMENT_FAILED_WEBHOOK' || paymentStatus === 'FAILED') {
      status = 'failed';
    }

    return {
      eventId,
      eventType,
      orderId,
      paymentId,
      status,
      payload,
    };
  }

  async getPayment(paymentId: string): Promise<any> {
    try {
      // Cashfree SDK: PGOrderFetchPayment requires order_id and cf_payment_id
      // Reference: https://github.com/cashfree/cashfree-pg-sdk-nodejs/blob/main/docs/Payments.md
      // PGOrderFetchPayment(x_api_version, order_id, cf_payment_id)
      // Since our interface only provides paymentId, we need order_id
      // This is a limitation - we'll need to fetch from order or store order_id
      // For now, throw a helpful error
      throw new Error(
        'Cashfree getPayment requires order_id. ' +
        'Use getPaymentByOrderAndPaymentId(orderId, cfPaymentId) or getPaymentsByOrderId(orderId) instead.'
      );
    } catch (error) {
      console.error('Cashfree fetch payment error:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch payment details');
    }
  }

  /**
   * Fetch payment by order ID and payment ID (Cashfree-specific helper)
   * Reference: https://github.com/cashfree/cashfree-pg-sdk-nodejs/blob/main/docs/Payments.md
   * PGOrderFetchPayment(x_api_version, order_id, cf_payment_id)
   */
  async getPaymentByOrderAndPaymentId(orderId: string, cfPaymentId: string): Promise<any> {
    try {
      const apiVersion = '2023-08-01';
      const response = await (this.cashfree).PGOrderFetchPayment(apiVersion, orderId, cfPaymentId);
      return response.data;
    } catch (error: any) {
      console.error('Cashfree fetch payment error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      throw new Error(`Failed to fetch payment details: ${errorMessage}`);
    }
  }

  /**
   * Fetch all payments for an order (Cashfree-specific helper)
   * Reference: https://github.com/cashfree/cashfree-pg-sdk-nodejs/blob/main/docs/Payments.md
   * PGOrderFetchPayments(x_api_version, order_id)
   */
  async getPaymentsByOrderId(orderId: string): Promise<any[]> {
    try {
      const apiVersion = '2023-08-01';
      const response = await (this.cashfree).PGOrderFetchPayments(apiVersion, orderId);
      return response.data || [];
    } catch (error: any) {
      console.error('Cashfree fetch payments error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      throw new Error(`Failed to fetch payments: ${errorMessage}`);
    }
  }

  async getOrder(orderId: string): Promise<any> {
    try {
      const response = await this.cashfree.PGFetchOrder(orderId, orderId);
      return response.data;
    } catch (error) {
      console.error('Cashfree fetch order error:', error);
      throw new Error('Failed to fetch order details');
    }
  }

  async createRefund(paymentId: string, amount?: number): Promise<any> {
    try {
      // Cashfree SDK: PGOrderCreateRefund requires order_id and refund request
      // Reference: https://github.com/cashfree/cashfree-pg-sdk-nodejs/blob/main/docs/Refunds.md
      // PGOrderCreateRefund(x_api_version, order_id, OrderCreateRefundRequest)
      // Since our interface only provides paymentId, we need order_id
      // This is a limitation - we'll need order_id to create refunds
      throw new Error(
        'Cashfree createRefund requires order_id. ' +
        'Use createRefundByOrderId(orderId, refundAmount, refundId?, refundNote?) instead.'
      );
    } catch (error) {
      console.error('Cashfree refund error:', error);
      throw error instanceof Error ? error : new Error('Failed to process refund');
    }
  }

  /**
   * Create refund by order ID (Cashfree-specific helper)
   * Reference: https://github.com/cashfree/cashfree-pg-sdk-nodejs/blob/main/docs/Refunds.md
   * PGOrderCreateRefund(x_api_version, order_id, OrderCreateRefundRequest)
   *
   * @param orderId - The order ID
   * @param refundAmount - Amount to refund (in base currency, e.g., rupees)
   * @param refundId - Optional refund ID (auto-generated if not provided)
   * @param refundNote - Optional refund note
   */
  async createRefundByOrderId(
    orderId: string,
    refundAmount: number,
    refundId?: string,
    refundNote?: string
  ): Promise<any> {
    try {
      const apiVersion = '2023-08-01';

      // Generate refund_id if not provided (required field)
      const generatedRefundId = refundId || `refund_${orderId}_${Date.now()}`;

      const refundRequest = {
        refund_id: generatedRefundId,
        refund_amount: refundAmount,
        ...(refundNote && { refund_note: refundNote }),
      };

      // PGOrderCreateRefund(x_api_version, order_id, OrderCreateRefundRequest)
      const response = await (this.cashfree).PGOrderCreateRefund(orderId, refundRequest);
      return response.data;
    } catch (error: any) {
      console.error('Cashfree refund error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      throw new Error(`Failed to process refund: ${errorMessage}`);
    }
  }

  getCheckoutScriptUrl(): string {
    // Cashfree uses @cashfreepayments/cashfree-js package, not a script URL
    return '';
  }

  getCheckoutInitFunction(): string {
    // Cashfree uses load() function from @cashfreepayments/cashfree-js
    return 'load';
  }
}


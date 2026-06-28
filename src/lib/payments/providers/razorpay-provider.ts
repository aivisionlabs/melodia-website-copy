/**
 * Razorpay Payment Provider
 * Implements PaymentProvider interface using Razorpay SDK
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import type {
  PaymentProvider,
  CreateOrderRequest,
  CreateOrderResponse,
  VerifyPaymentRequest,
  WebhookEvent,
} from '../types';

export class RazorpayProvider implements PaymentProvider {
  private razorpay: Razorpay;
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    if (!this.keyId || !this.keySecret) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required');
    }

    this.razorpay = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  getName(): 'razorpay' {
    return 'razorpay';
  }

  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      const order = await this.razorpay.orders.create({
        amount: request.amount * 100, // Convert rupees to paise
        currency: request.currency || 'INR',
        receipt: request.receipt || `receipt_${Date.now()}`,
        notes: request.notes || {},
      });

      return {
        orderId: order.id,
        amount: typeof order.amount === 'string' ? parseInt(order.amount, 10) : order.amount,
        currency: order.currency || 'INR',
        providerData: {
          key: this.keyId,
        },
      };
    } catch (error) {
      console.error('Razorpay order creation error:', error);
      throw new Error('Failed to create payment order');
    }
  }

  verifyPaymentSignature(request: VerifyPaymentRequest): boolean {
    try {
      const body = `${request.orderId}|${request.paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(body)
        .digest('hex');

      return expectedSignature === request.signature;
    } catch (error) {
      console.error('Razorpay signature verification error:', error);
      return false;
    }
  }

  async verifyWebhookSignature(
    body: string, 
    signature: string, 
    timestamp?: string
  ): Promise<boolean> {
    try {
      // Razorpay doesn't use timestamp in signature
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(body)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Razorpay webhook signature verification error:', error);
      return false;
    }
  }

  async processWebhookEvent(payload: any): Promise<WebhookEvent> {
    // Extract event information from Razorpay webhook payload
    const eventType = payload.event;
    const eventId = payload.id || payload.event_id || `evt_${Date.now()}`;
    
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;
    
    const orderId = orderEntity?.id || paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    // Map Razorpay event types to status
    const statusMap: Record<string, 'completed' | 'failed' | 'refunded' | 'pending'> = {
      'payment.captured': 'completed',
      'order.paid': 'completed',
      'payment.failed': 'failed',
      'refund.processed': 'refunded',
    };

    return {
      eventId,
      eventType,
      orderId,
      paymentId,
      status: statusMap[eventType] || 'pending',
      payload,
    };
  }

  async getPayment(paymentId: string): Promise<any> {
    try {
      return await this.razorpay.payments.fetch(paymentId);
    } catch (error) {
      console.error('Razorpay fetch payment error:', error);
      throw new Error('Failed to fetch payment details');
    }
  }

  async getOrder(orderId: string): Promise<any> {
    try {
      return await this.razorpay.orders.fetch(orderId);
    } catch (error) {
      console.error('Razorpay fetch order error:', error);
      throw new Error('Failed to fetch order details');
    }
  }

  async createRefund(paymentId: string, amount?: number): Promise<any> {
    try {
      return await this.razorpay.payments.refund(paymentId, {
        amount: amount,
      });
    } catch (error) {
      console.error('Razorpay refund error:', error);
      throw new Error('Failed to process refund');
    }
  }

  getCheckoutScriptUrl(): string {
    return 'https://checkout.razorpay.com/v1/checkout.js';
  }

  getCheckoutInitFunction(): string {
    return 'Razorpay';
  }
}


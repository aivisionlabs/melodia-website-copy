/**
 * Payment Provider Factory
 * Provides a unified interface for payment operations
 * Similar to EmailFactory pattern
 */

import type { PaymentProvider, PaymentProviderType } from './types';
import { RazorpayProvider } from './providers/razorpay-provider';
import { CashfreeProvider } from './providers/cashfree-provider';

let paymentProviderInstance: PaymentProvider | null = null;

export class PaymentProviderFactory {
  /**
   * Get payment provider instance
   * Returns singleton instance of the configured provider
   */
  static getProvider(): PaymentProvider {
    if (paymentProviderInstance) {
      return paymentProviderInstance;
    }

    const providerType: PaymentProviderType =
      (process.env.PAYMENT_PROVIDER as PaymentProviderType) || 'razorpay';

    switch (providerType) {
      case 'razorpay':
        paymentProviderInstance = new RazorpayProvider();
        break;
      case 'cashfree':
        paymentProviderInstance = new CashfreeProvider();
        break;
      default:
        throw new Error(
          `Unknown payment provider: ${providerType}. Supported providers: razorpay, cashfree`
        );
    }

    return paymentProviderInstance;
  }

  /**
   * Reset provider instance (useful for testing)
   */
  static resetProvider(): void {
    paymentProviderInstance = null;
  }

  /**
   * Get current provider type
   */
  static getProviderType(): PaymentProviderType {
    return (process.env.PAYMENT_PROVIDER as PaymentProviderType) || 'razorpay';
  }
}


/**
 * Get Payment Provider Info
 * GET /api/payments/provider
 * Returns current payment provider configuration
 */

import { NextResponse } from 'next/server';
import { PaymentProviderFactory } from '@/lib/payments/factory';

export async function GET() {
  try {
    const provider = PaymentProviderFactory.getProvider();
    
    return NextResponse.json({
      provider: provider.getName(),
      checkoutScriptUrl: provider.getCheckoutScriptUrl(),
      checkoutInitFunction: provider.getCheckoutInitFunction(),
    });
  } catch (error) {
    console.error('Error getting payment provider info:', error);
    return NextResponse.json(
      { error: 'Failed to get payment provider info' },
      { status: 500 }
    );
  }
}


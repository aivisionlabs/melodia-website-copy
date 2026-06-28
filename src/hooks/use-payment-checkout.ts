/**
 * Payment Checkout Hook
 * Provider-agnostic payment checkout hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PaymentCheckoutOptions, PaymentResponse } from '@/types/payment';
// @ts-ignore - @cashfreepayments/cashfree-js doesn't have TypeScript types
import { load as loadCashfree } from '@cashfreepayments/cashfree-js';

interface PaymentProviderInfo {
  provider: 'razorpay' | 'cashfree';
  checkoutScriptUrl: string;
  checkoutInitFunction: string;
}

export function usePaymentCheckout() {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [providerInfo, setProviderInfo] = useState<PaymentProviderInfo | null>(null);
  const cashfreeInstanceRef = useRef<any>(null);

  // Detect provider from API
  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const response = await fetch('/api/payments/provider');
        if (response.ok) {
          const data = await response.json();
          setProviderInfo({
            provider: data.provider,
            checkoutScriptUrl: data.checkoutScriptUrl,
            checkoutInitFunction: data.checkoutInitFunction,
          });
        } else {
          // Fallback to environment variable
          const fallbackProvider = (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER as 'razorpay' | 'cashfree') || 'razorpay';
          setProviderInfo({
            provider: fallbackProvider,
            checkoutScriptUrl: fallbackProvider === 'razorpay'
              ? 'https://checkout.razorpay.com/v1/checkout.js'
              : 'https://sdk.cashfree.com/js/v3/cashfree.js',
            checkoutInitFunction: fallbackProvider === 'razorpay' ? 'Razorpay' : 'Cashfree',
          });
        }
      } catch (error) {
        console.error('Error fetching payment provider:', error);
        // Fallback to Razorpay
        setProviderInfo({
          provider: 'razorpay',
          checkoutScriptUrl: 'https://checkout.razorpay.com/v1/checkout.js',
          checkoutInitFunction: 'Razorpay',
        });
      }
    };
    fetchProvider();
  }, []);

  // Load provider-specific script
  useEffect(() => {
    if (!providerInfo) return;

    if (providerInfo.provider === 'razorpay') {
      // Load Razorpay script
      if (scriptLoaded || scriptError) return;

      const script = document.createElement('script');
      script.src = providerInfo.checkoutScriptUrl;
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => setScriptError(true);
      document.body.appendChild(script);

      return () => {
        const existingScript = document.querySelector(`script[src="${providerInfo.checkoutScriptUrl}"]`);
        if (existingScript) existingScript.remove();
      };
    } else if (providerInfo.provider === 'cashfree') {
      // Initialize Cashfree SDK using @cashfreepayments/cashfree-js
      const initializeCashfree = async () => {
        try {
          // Use NODE_ENV to decide Cashfree mode instead of a custom env flag
          const isProduction = process.env.NODE_ENV === 'production';
          cashfreeInstanceRef.current = await loadCashfree({
            mode: isProduction ? 'production' : 'sandbox',
          });
          setScriptLoaded(true);
          console.log('Cashfree SDK initialized successfully');
        } catch (error) {
          console.error('Error initializing Cashfree SDK:', error);
          setScriptError(true);
        }
      };

      if (!scriptLoaded && !scriptError) {
        initializeCashfree();
      }
    }
  }, [providerInfo, scriptLoaded, scriptError]);

  const openCheckout = useCallback((options: PaymentCheckoutOptions) => {
    if (!providerInfo || !scriptLoaded) {
      throw new Error('Payment provider not ready');
    }

    if (providerInfo.provider === 'razorpay') {
      // Razorpay checkout
      if (!(window as any).Razorpay) {
        throw new Error('Razorpay not loaded');
      }
      const Razorpay = (window as any).Razorpay;
      const razorpay = new Razorpay({
        key: options.providerData?.key,
        amount: options.amount,
        currency: options.currency,
        name: options.name,
        description: options.description,
        order_id: options.orderId,
        handler: options.handler,
        prefill: options.prefill,
        theme: options.theme,
        modal: { ondismiss: options.onCancel },
      });
      razorpay.open();
    } else if (providerInfo.provider === 'cashfree') {
      // Cashfree checkout using @cashfreepayments/cashfree-js
      const checkoutUrl = options.providerData?.checkoutUrl;
      const sessionId = options.providerData?.sessionId;

      console.log('Opening Cashfree checkout:', {
        hasCheckoutUrl: !!checkoutUrl,
        checkoutUrl,
        hasSessionId: !!sessionId,
        hasCashfreeInstance: !!cashfreeInstanceRef.current,
      });

      if (checkoutUrl) {
        // Redirect checkout (recommended for Cashfree)
        console.log('Redirecting to Cashfree checkout URL:', checkoutUrl);
        window.location.href = checkoutUrl;
        return; // Page will navigate away
      } else if (sessionId && cashfreeInstanceRef.current) {
        // Use Cashfree SDK for checkout
        console.log('Opening Cashfree checkout with session:', sessionId);
        try {
          // cashfree.checkout() returns a promise, but we're using redirect so we can skip handling it
          // The redirect will happen automatically
          cashfreeInstanceRef.current.checkout({
            paymentSessionId: sessionId,
            redirectTarget: '_self', // Open in current tab
          }).catch((error: any) => {
            // Log error but don't block - redirect might still happen
            console.error('Cashfree checkout error (non-blocking):', error);
          });
        } catch (error) {
          console.error('Error calling Cashfree checkout:', error);
          throw new Error('Failed to open Cashfree checkout');
        }
      } else {
        const errorMsg = !checkoutUrl && !sessionId
          ? 'Cashfree checkout URL and session ID are missing'
          : !cashfreeInstanceRef.current
            ? 'Cashfree SDK not initialized'
            : 'Cashfree checkout configuration is invalid';
        console.error('Cashfree checkout error:', errorMsg, options.providerData);
        throw new Error(errorMsg);
      }
    }
  }, [providerInfo, scriptLoaded]);

  return {
    scriptLoaded,
    scriptError,
    provider: providerInfo?.provider || null,
    openCheckout,
  };
}


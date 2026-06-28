/**
 * Email Service
 * Public API for sending emails
 * Uses factory pattern internally to support multiple email providers
 * Maintains backward compatibility with existing function exports
 */

import { EmailFactory } from './email/email-factory';

/**
 * Send email verification code
 * @deprecated This function is maintained for backward compatibility
 * Use EmailFactory.getProvider().sendVerificationEmail() for new code
 */
export async function sendVerificationEmail(
  email: string,
  code: string,
  name: string
) {
  const provider = EmailFactory.getProvider();
  return provider.sendVerificationEmail(email, code, name);
}

/**
 * Send password reset email
 * @deprecated This function is maintained for backward compatibility
 * Use EmailFactory.getProvider().sendPasswordResetEmail() for new code
 */
export async function sendPasswordResetEmail(
  email: string,
  code: string,
  name: string
) {
  const provider = EmailFactory.getProvider();
  return provider.sendPasswordResetEmail(email, code, name);
}

/**
 * Send song request confirmation email
 * @deprecated This function is maintained for backward compatibility
 * Use EmailFactory.getProvider().sendSongRequestConfirmation() for new code
 */
export async function sendSongRequestConfirmation(
  email: string,
  requesterName: string | undefined,
  recipientName: string,
  requestId: number
) {
  const provider = EmailFactory.getProvider();
  return provider.sendSongRequestConfirmation(
    email,
    requesterName,
    recipientName,
    requestId
  );
}

/**
 * Send song ready notification
 * @deprecated This function is maintained for backward compatibility
 * Use EmailFactory.getProvider().sendSongReadyNotification() for new code
 */
export async function sendSongReadyNotification(
  email: string,
  requesterName: string | undefined,
  songTitle: string,
  songSlug: string
) {
  const provider = EmailFactory.getProvider();
  return provider.sendSongReadyNotification(
    email,
    requesterName,
    songTitle,
    songSlug
  );
}

/**
 * Send payment confirmation email
 * @deprecated This function is maintained for backward compatibility
 * Use EmailFactory.getProvider().sendPaymentConfirmation() for new code
 */
export async function sendPaymentConfirmation(
  email: string,
  name: string,
  amount: number,
  currency: string,
  paymentId: string
) {
  const provider = EmailFactory.getProvider();
  return provider.sendPaymentConfirmation(
    email,
    name,
    amount,
    currency,
    paymentId
  );
}


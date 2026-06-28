/**
 * Email Factory
 * Provides a unified interface for email operations
 * Similar to SunoAPIFactory pattern
 */

import type { EmailProvider, EmailProviderType } from './types';
import { ResendProvider } from './providers/resend-provider';

let emailProviderInstance: EmailProvider | null = null;

/**
 * Factory class for Email Provider
 * Provides a unified interface for email operations
 */
export class EmailFactory {
  /**
   * Get email provider instance
   * Returns singleton instance of the configured provider
   */
  static getProvider(): EmailProvider {
    if (emailProviderInstance) {
      return emailProviderInstance;
    }

    const providerType: EmailProviderType =
      (process.env.EMAIL_PROVIDER as EmailProviderType) || 'resend';

    switch (providerType) {
      case 'resend':
        emailProviderInstance = new ResendProvider();
        break;
      case 'sendgrid':
        // TODO: Implement SendGrid provider when needed
        throw new Error(
          'SendGrid provider not yet implemented. Please use "resend" provider.'
        );
      default:
        throw new Error(
          `Unknown email provider: ${providerType}. Supported providers: resend, sendgrid`
        );
    }

    return emailProviderInstance;
  }

  /**
   * Reset provider instance (useful for testing)
   */
  static resetProvider(): void {
    emailProviderInstance = null;
  }
}


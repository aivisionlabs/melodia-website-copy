/**
 * Email Service Types and Interfaces
 * Defines the contract for email providers
 */

/**
 * Result of an email sending operation
 */
export interface EmailResult {
  success: boolean;
  error?: unknown;
}

/**
 * Basic email options for sending emails
 */
export interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  html: string;
}

/**
 * Email Provider Interface
 * All email providers must implement this interface
 */
export interface EmailProvider {
  /**
   * Send a generic email
   */
  sendEmail(options: EmailOptions): Promise<EmailResult>;

  /**
   * Send email verification code
   */
  sendVerificationEmail(
    email: string,
    code: string,
    name: string
  ): Promise<EmailResult>;

  /**
   * Send password reset email
   */
  sendPasswordResetEmail(
    email: string,
    code: string,
    name: string
  ): Promise<EmailResult>;

  /**
   * Send song request confirmation email
   */
  sendSongRequestConfirmation(
    email: string,
    requesterName: string | undefined,
    recipientName: string,
    requestId: number
  ): Promise<EmailResult>;

  /**
   * Send song ready notification email
   */
  sendSongReadyNotification(
    email: string,
    requesterName: string | undefined,
    songTitle: string,
    // Slug or numeric id — interpolated into the /song-options/{…} URL.
    songId: string | number
  ): Promise<EmailResult>;

  /**
   * Send payment confirmation email
   */
  sendPaymentConfirmation(
    email: string,
    name: string,
    amount: number,
    currency: string,
    paymentId: string
  ): Promise<EmailResult>;

  /**
   * Send internal notification email (e.g., to admin/internal team)
   */
  sendInternalNotification(
    to: string,
    subject: string,
    html: string
  ): Promise<EmailResult>;
}

/**
 * Supported email provider types
 */
export type EmailProviderType = 'resend' | 'sendgrid';


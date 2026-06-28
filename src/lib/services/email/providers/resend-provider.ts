/**
 * Resend Email Provider
 * Implements EmailProvider interface using Resend SDK
 */

import { Resend } from 'resend';
import type { EmailProvider, EmailOptions, EmailResult } from '../types';
import {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getSongRequestConfirmationTemplate,
  getSongReadyTemplate,
  getPaymentConfirmationTemplate,
} from '../templates';
import { getBaseUrl } from '@/lib/utils/url';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@melodia.com';

export class ResendProvider implements EmailProvider {
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    this.resend = new Resend(apiKey);
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      await this.resend.emails.send({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error };
    }
  }

  /**
   * Send email verification code
   */
  async sendVerificationEmail(
    email: string,
    code: string,
    name: string
  ): Promise<EmailResult> {
    try {
      await this.resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: '🎵 Verify your Melodia account',
        html: getVerificationEmailTemplate(name, code),
      });

      console.log(`Verification email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return { success: false, error };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    code: string,
    name: string
  ): Promise<EmailResult> {
    try {
      await this.resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: '🔒 Reset your Melodia password',
        html: getPasswordResetEmailTemplate(name, code),
      });

      console.log(`Password reset email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return { success: false, error };
    }
  }

  /**
   * Send song request confirmation email
   */
  async sendSongRequestConfirmation(
    email: string,
    requesterName: string | undefined,
    recipientName: string,
    requestId: number
  ): Promise<EmailResult> {
    try {
      await this.resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: '🎵 Your Melodia song request has been received',
        html: getSongRequestConfirmationTemplate(
          requesterName || 'there',
          recipientName,
          requestId
        ),
      });

      console.log(`Song request confirmation sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send song request confirmation:', error);
      return { success: false, error };
    }
  }

  /**
   * Send song ready notification email
   */
  async sendSongReadyNotification(
    email: string,
    requesterName: string | undefined,
    songTitle: string,
    songId: string | number
  ): Promise<EmailResult> {
    const baseUrl = await getBaseUrl();
    const songUrl = `${baseUrl}/song-options/${songId}`;

    try {
      await this.resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: '🎵 Your Melodia song is ready!',
        html: getSongReadyTemplate(requesterName || 'there', songTitle, songUrl),
      });

      console.log(`Song ready notification sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send song ready notification:', error);
      return { success: false, error };
    }
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(
    email: string,
    name: string,
    amount: number,
    currency: string,
    paymentId: string
  ): Promise<EmailResult> {
    try {
      await this.resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: '💳 Payment confirmation - Melodia',
        html: getPaymentConfirmationTemplate(name, amount, currency, paymentId),
      });

      console.log(`Payment confirmation sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send payment confirmation:', error);
      return { success: false, error };
    }
  }

  /**
   * Send internal notification email (e.g., to admin/internal team)
   */
  async sendInternalNotification(
    to: string,
    subject: string,
    html: string
  ): Promise<EmailResult> {
    try {
      await this.resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      });


      console.log(`Internal notification sent to ${to}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send internal notification:', error);
      return { success: false, error };
    }
  }
}


'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { OTPInput } from '@/components/forms/OTPInput';
import { apiPost } from '@/lib/api-utils';

export default function ForgotPasswordVerifyOTPPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  // Get email from sessionStorage
  useEffect(() => {
    const storedEmail = sessionStorage.getItem('forgot-password-email');
    if (!storedEmail) {
      // Redirect back to forgot password page if no email found
      router.replace('/forgot-password');
      return;
    }
    setEmail(storedEmail);
  }, [router]);

  const handleVerifyOTP = async (otpCode: string) => {
    if (!email || !otpCode || otpCode.length !== 6) return;

    setIsVerifying(true);
    setError(null);

    try {
      const response = await apiPost('/api/auth/verify-forgot-password-otp', {
        email,
        code: otpCode
      });

      const data = await response.json();

      if (data.success) {
        // Store verification token for password reset
        sessionStorage.setItem('password-reset-token', data.data.resetToken);
        // Redirect to reset password page
        router.push('/reset-password');
      } else {
        setError(data.error?.message || 'Invalid verification code');

        // Handle attempts remaining
        if (data.error?.details?.attemptsRemaining !== undefined) {
          setAttemptsRemaining(data.error.details.attemptsRemaining);
        }

        // Clear OTP input on error
        setOtp('');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Network error. Please check your connection and try again.');
      setOtp('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email) return;

    try {
      const response = await apiPost('/api/auth/forgot-password', {
        email
      });

      const data = await response.json();

      if (data.success) {
        setError(null);
        setAttemptsRemaining(null);
        // Show success message briefly
        setError('New verification code sent to your email');
        setTimeout(() => setError(null), 3000);
      } else {
        setError(data.error?.message || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      setError('Failed to resend OTP. Please try again.');
    }
  };

  // Don't render if no email
  if (!email) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Link href="/forgot-password" className="p-2 -ml-2">
          <svg className="w-6 h-6 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="w-6"></div> {/* Spacer for centering */}
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-sm">
          {/* Title Section */}
          <h1 className="font-display text-4xl font-bold text-text mb-4">
            Check your email
          </h1>
          <p className="text-text/80 mb-8 font-body">
            We sent a 6-digit verification code to <span className="font-medium">{email}</span>.
            Please enter it below.
          </p>

          {/* OTP Input Section */}
          <div className="space-y-8">
            <OTPInput
              value={otp}
              onChange={setOtp}
              onComplete={(value) => handleVerifyOTP(value)}
              disabled={isVerifying}
              error={!!error}
            />

            {/* Error Message */}
            {error && (
              <div className={`text-sm text-center ${error.includes('sent') ? 'text-green-600' : 'text-red-500'}`}>
                {error}
                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <div className="mt-1 text-xs text-text/60">
                    {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
                  </div>
                )}
              </div>
            )}

            {/* Verify Button */}
            <Button
              onClick={() => handleVerifyOTP(otp)}
              disabled={otp.length !== 6 || isVerifying}
              className="w-full h-14 bg-primary text-text font-display font-bold text-lg rounded-full shadow-md hover:bg-yellow-400 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? "Verifying..." : "Verify Code"}
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-text/60 text-sm font-body">
          Didn&apos;t receive the code?{' '}
          <button
            onClick={handleResendOTP}
            className="text-accent font-medium hover:underline"
          >
            Resend Code
          </button>
        </p>
      </footer>
    </div>
  );
}

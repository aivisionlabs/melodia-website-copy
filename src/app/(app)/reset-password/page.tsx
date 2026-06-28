'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/forms/PasswordField';
import { apiPost } from '@/lib/api-utils';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  // Get reset token from sessionStorage
  useEffect(() => {
    const storedToken = sessionStorage.getItem('password-reset-token');
    if (!storedToken) {
      // Redirect back to forgot password page if no token found
      router.replace('/forgot-password');
      return;
    }
    setResetToken(storedToken);
  }, [router]);

  const validatePassword = (pwd: string): string | null => {
    if (!pwd) return 'Password is required';
    if (pwd.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const validateConfirmPassword = (pwd: string, confirmPwd: string): string | null => {
    if (!confirmPwd) return 'Please confirm your password';
    if (pwd !== confirmPwd) return 'Passwords do not match';
    return null;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);

    // Clear errors when user starts typing
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: undefined }));
    }

    // Validate confirm password if it exists
    if (confirmPassword) {
      const confirmError = validateConfirmPassword(newPassword, confirmPassword);
      setErrors(prev => ({ ...prev, confirmPassword: confirmError || undefined }));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);

    // Clear errors when user starts typing
    if (errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetToken) {
      router.replace('/forgot-password');
      return;
    }

    // Validate form
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(password, confirmPassword);

    if (passwordError || confirmPasswordError) {
      setErrors({
        password: passwordError || undefined,
        confirmPassword: confirmPasswordError || undefined
      });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await apiPost('/api/auth/reset-password', {
        resetToken,
        newPassword: password
      });

      const data = await response.json();

      if (data.success) {
        // Clear session storage
        sessionStorage.removeItem('forgot-password-email');
        sessionStorage.removeItem('password-reset-token');

        // Redirect to login page with success message
        router.push('/login?message=password-reset-success');
      } else {
        setErrors({
          general: data.error?.message || 'Failed to reset password. Please try again.'
        });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setErrors({
        general: 'Network error. Please check your connection and try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = password.length >= 6 && password === confirmPassword;

  // Don't render if no reset token
  if (!resetToken) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Link href="/verify-forgot-password-otp" className="p-2 -ml-2">
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
            Reset Password
          </h1>
          <p className="text-text/80 mb-10 font-body">
            Enter your new password below. Make sure it&apos;s at least 6 characters long.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password Field */}
            <PasswordField
              id="password"
              placeholder="New Password"
              value={password}
              onChange={handlePasswordChange}
              error={errors.password}
              required
              showPassword={showPassword}
              onToggleVisibility={() => setShowPassword(!showPassword)}
            />

            {/* Confirm Password Field */}
            <PasswordField
              id="confirmPassword"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              error={errors.confirmPassword}
              required
              showPassword={showConfirmPassword}
              onToggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
            />

            {/* General Error Message */}
            {errors.general && (
              <div className="text-sm text-red-500 text-center bg-red-50 border border-red-200 rounded-lg p-3">
                {errors.general}
              </div>
            )}

            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full h-14 bg-primary text-text font-display font-bold text-lg rounded-full shadow-md hover:bg-yellow-400 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Updating Password..." : "Update Password"}
            </Button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-text/60 text-sm font-body">
          Remember your password?{' '}
          <Link href="/login" className="text-accent font-medium hover:underline">
            Back to Login
          </Link>
        </p>
      </footer>
    </div>
  );
}

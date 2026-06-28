"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { OTPInput } from "@/components/forms/OTPInput";
import { ResendButton } from "@/components/forms/ResendButton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Single Responsibility: Component handles OTP verification page UI and flow
function VerifyEmailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  // Get email from query params or sessionStorage
  const [email, setEmail] = useState<string | null>(null);

  // Simplified state management
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(
    null,
  );

  // Initialize email from query params or sessionStorage
  useEffect(() => {
    const emailFromQuery = searchParams.get("email");
    const emailFromStorage = sessionStorage.getItem("signup_email");

    console.log("Verify page initialized:", {
      emailFromQuery,
      emailFromStorage,
    });

    if (emailFromQuery) {
      console.log("Setting email from query params:", emailFromQuery);
      setEmail(emailFromQuery);
      sessionStorage.setItem("signup_email", emailFromQuery);
    } else if (emailFromStorage) {
      console.log("Setting email from sessionStorage:", emailFromStorage);
      setEmail(emailFromStorage);
    } else {
      console.log("No email found, redirecting to signup");
      // No email found, redirect back to signup
      router.replace("/signup");
    }
  }, [searchParams, router]);

  // Single Responsibility: Send verification email
  const handleSendVerification = useCallback(async () => {
    if (!email) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.error?.message || "Failed to send verification code");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  // Handle close/back action
  const handleClose = () => {
    router.back();
  };

  // Single Responsibility: Handle OTP verification
  const handleVerifyOTP = async (otpValue?: string) => {
    if (!email) return;

    const codeToVerify = otpValue || otp;

    if (codeToVerify.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: codeToVerify }),
      });

      const data = await response.json();

      if (data.success) {
        // Clear signup email from sessionStorage
        sessionStorage.removeItem("signup_email");

        // Get password from sessionStorage (stored during signup)
        const password = sessionStorage.getItem("signup_password");

        // Clear password from sessionStorage
        sessionStorage.removeItem("signup_password");

        // Log the user in
        if (password) {
          const loginResult = await login(email, password);
          if (loginResult.success) {
            router.push("/profile");
          } else {
            // If login fails, redirect to login page
            router.push("/profile?email=" + encodeURIComponent(email));
          }
        } else {
          // No password stored, redirect to login page
          router.push("/profile?email=" + encodeURIComponent(email));
        }
      } else {
        setError(data.error || "Invalid verification code");
        setOtp("");
      }
    } catch {
      setError("Network error. Please try again.");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while initializing
  if (!email) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header with Close Button */}
      <header className="flex items-center justify-between p-4">
        <div></div>
        <button
          onClick={handleClose}
          className="text-melodia-teal hover:text-melodia-coral transition-colors"
          aria-label="Close"
        >
          <svg
            fill="currentColor"
            height="28"
            viewBox="0 0 256 256"
            width="28"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
          </svg>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-sm">
          {/* Title Section */}
          <h1 className="font-display text-4xl font-bold text-melodia-teal mb-4">
            Check your email
          </h1>
          <p className="text-melodia-teal/80 mb-2">
            We sent a 6-digit confirmation code to
          </p>
          <p className="text-melodia-teal font-medium mb-8">{email}</p>
          <p className="text-melodia-teal/80 mb-8">Please enter it below.</p>

          {/* OTP Input Section */}
          <div className="space-y-8">
            <OTPInput
              value={otp}
              onChange={setOtp}
              onComplete={(value) => handleVerifyOTP(value)}
              disabled={isLoading}
              error={!!error}
            />

            {/* Error Message */}
            {error && (
              <div className="text-sm text-melodia-coral text-center">
                {error}
                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <div className="mt-1 text-xs text-melodia-teal/60">
                    {attemptsRemaining} attempt
                    {attemptsRemaining !== 1 ? "s" : ""} remaining
                  </div>
                )}
              </div>
            )}

            {/* Verify Button */}
            <Button
              onClick={() => handleVerifyOTP(otp)}
              disabled={otp.length !== 6 || isLoading}
              size="lg"
              className="w-full h-14 bg-primary text-text font-display font-bold text-lg rounded-full shadow-md hover:bg-yellow-400 transition-colors duration-300"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  Verifying...
                </div>
              ) : (
                "Verify"
              )}
            </Button>
          </div>

          {/* Resend Section */}
          <div className="mt-6 text-center">
            <p className="text-sm text-melodia-teal/60 mb-2">
              Didn&apos;t receive the code?
            </p>
            <ResendButton
              onResend={handleSendVerification}
              disabled={isLoading}
              cooldownSeconds={60}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-xs text-melodia-teal/60">
          © 2026 All Rights Reserved by AIVISIONLABS | www.melodia-songs.com
        </p>
      </footer>
    </div>
  );
}

// Wrap in Suspense boundary as required by Next.js for useSearchParams
export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <LoadingSpinner size="lg" text="Loading..." />
        </div>
      }
    >
      <VerifyEmailPageContent />
    </Suspense>
  );
}

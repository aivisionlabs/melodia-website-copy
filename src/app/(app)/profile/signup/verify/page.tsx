/**
 * Email Verification Page
 * Verify email with OTP code
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { OTPInput } from "@/components/forms/OTPInput";
import { ResendButton } from "@/components/forms/ResendButton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const handleVerify = async (otpValue: string) => {
    setError("");
    setIsVerifying(true);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: otpValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Verification failed");
        return;
      }

      setIsVerified(true);
      setTimeout(() => {
        router.push("/profile/login?verified=true");
      }, 2000);
    } catch (error) {
      console.error("Verification error:", error);
      setError("An unexpected error occurred");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    // TODO: Implement resend verification email API
    console.log("Resending verification email...");
  };

  useEffect(() => {
    if (otp.length === 6) {
      handleVerify(otp);
    }
  }, [otp]);

  if (isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-elegant p-8 text-center">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-teal font-heading mb-2">
            Email Verified!
          </h1>
          <p className="text-text-teal/70">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Link
          href="/profile/signup"
          className="inline-flex items-center text-text-teal hover:text-accent-coral transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>

        <div className="bg-white rounded-2xl shadow-elegant p-8">
          <h1 className="text-3xl font-bold text-text-teal font-heading mb-2 text-center">
            Verify Your Email
          </h1>
          <p className="text-text-teal/70 mb-8 text-center">
            We sent a 6-digit code to <br />
            <span className="font-semibold">{email}</span>
          </p>

          <div className="mb-6">
            <OTPInput
              value={otp}
              onChange={setOtp}
              onComplete={handleVerify}
              error={!!error}
              disabled={isVerifying}
            />
          </div>

          {error && (
            <div className="mb-6">
              <Button
                onClick={() => handleVerify(otp)}
                disabled={otp.length !== 6 || isVerifying}
                className="w-full bg-primary-yellow text-text-teal hover:bg-primary-yellow/90 font-bold"
              >
                Try Again
              </Button>
            </div>
          )}

          <ResendButton onResend={handleResend} />

          <p className="mt-6 text-sm text-text-teal/70 text-center">
            Didn&apos;t receive the code? Check your spam folder or try
            resending.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/FormField";
import { apiPost } from "@/lib/api-utils";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setEmail(e.target.value);
    if (error) setError(null); // Clear error when user starts typing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Basic email validation
    if (!email.trim()) {
      setError("Email is required");
      setIsSubmitting(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await apiPost("/api/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      const data = await response.json();

      if (data.success) {
        // Store email in sessionStorage for OTP verification
        sessionStorage.setItem(
          "forgot-password-email",
          email.trim().toLowerCase()
        );
        // Redirect to OTP verification page
        router.push("/verify-forgot-password-otp");
      } else {
        setError(
          data.error?.message || "Failed to send OTP. Please try again."
        );
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Link href="/login" className="p-2 -ml-2">
          <svg
            className="w-6 h-6 text-text"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div className="w-6"></div> {/* Spacer for centering */}
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-sm">
          {/* Title Section */}
          <h1 className="font-display text-4xl font-bold text-text mb-4">
            Forgot Password?
          </h1>
          <p className="text-text/80 mb-10 font-body">
            Enter your email address and we will send you a verification code to
            reset your password.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={handleEmailChange}
              error={error || undefined}
              required
              className="w-full h-14 px-5 bg-white border border-text/20 rounded-lg placeholder-text/50 focus:ring-2 focus:ring-primary focus:border-transparent font-body"
            />

            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full h-14 bg-primary text-text font-display font-bold text-lg rounded-full shadow-md hover:bg-yellow-400 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Sending OTP..." : "Get OTP"}
            </Button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-text/60 text-sm font-body">
          Remember your password?{" "}
          <Link
            href="/login"
            className="text-accent font-medium hover:underline"
          >
            Back to Login
          </Link>
        </p>
      </footer>
    </div>
  );
}

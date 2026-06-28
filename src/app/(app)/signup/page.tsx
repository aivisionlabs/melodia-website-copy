"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useProfileInfoForm } from "@/hooks/use-profile-info-form";
import { FormField } from "@/components/forms/FormField";
import { PasswordField } from "@/components/forms/PasswordField";
import { trackAuthEvent } from "@/lib/analytics";
import { useEffect } from "react";

// Single Responsibility: Component handles signup page UI (no auth check needed)
export default function SignupPage() {
  const router = useRouter();

  // State for independent password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dependency Inversion: Use custom hook for form management
  const form = useProfileInfoForm();

  // Single Responsibility: Handle close/cancel action
  const handleClose = () => {
    router.back();
  };

  useEffect(() => {
    trackAuthEvent.signupView();
  }, []);


  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Close Button */}
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
            Tell us about you
          </h1>
          <p className="text-melodia-teal/80 mb-10">
            We need a little more info to set up your account.
          </p>

          {/* Form Section */}
          <form onSubmit={form.handleSubmit} className="space-y-6">
            <FormField
              id="name"
              placeholder="Full name"
              value={form.name}
              onChange={form.handleNameChange}
              error={form.validation.errors.name}
              required
            />

            <FormField
              id="dateOfBirth"
              placeholder="Date of birth (DD/MM/YYYY)"
              value={form.dateOfBirth}
              onChange={form.handleDateOfBirthChange}
              error={form.validation.errors.dateOfBirth}
              maxLength={10}
              required
            />

            <FormField
              id="email"
              type="email"
              placeholder="Email address (required)"
              value={form.email}
              onChange={form.handleEmailChange}
              error={form.validation.errors.email}
              required
            />

            <PasswordField
              id="password"
              placeholder="Password (minimum 6 characters)"
              value={form.password}
              onChange={form.handlePasswordChange}
              error={form.validation.errors.password}
              required
              showPassword={showPassword}
              onToggleVisibility={() => setShowPassword(!showPassword)}
            />

            <PasswordField
              id="confirmPassword"
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={form.handleConfirmPasswordChange}
              error={form.validation.errors.confirmPassword}
              required
              showPassword={showConfirmPassword}
              onToggleVisibility={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
            />

            <FormField
              id="phoneNumber"
              type="tel"
              placeholder="Phone number (optional)"
              value={form.phoneNumber}
              onChange={form.handlePhoneNumberChange}
              error={form.validation.errors.phoneNumber}
            />

            <Button
              type="submit"
              size="lg"
              disabled={!form.isFormValid || form.isSubmitting}
              className="w-full h-14 bg-primary text-text font-display font-bold text-lg rounded-full shadow-md hover:bg-yellow-400 transition-colors duration-300"
            >
              {form.isSubmitting ? "Continuing..." : "Continue"}
            </Button>

            {form.validation.errors.email && (
              <div className="text-sm text-melodia-coral text-center">
                {form.validation.errors.email}
              </div>
            )}
          </form>

          {/* Sign In Link */}
          <div className="text-center mt-6">
            <span className="text-melodia-teal font-body text-sm">
              Already have an account?{" "}
            </span>
            <Link
              href="/login"
              className="text-melodia-coral font-medium hover:underline font-body text-sm"
            >
              Sign in here
            </Link>
          </div>
        </div>
      </main>

      {/* Footer with Legal Text - Fixed at bottom */}
      <footer className="p-6 text-center">
        <p className="text-xs text-melodia-teal/60">
          By continuing, you agree to Melodia&apos;s{" "}
          <Link
            href="/terms"
            className="underline text-melodia-coral hover:text-melodia-coral/80"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline text-melodia-coral hover:text-melodia-coral/80"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}

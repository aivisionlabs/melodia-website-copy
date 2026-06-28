"use client";

import { useState } from "react";
import { X, Loader2, ArrowRight, MessageCircle } from "lucide-react";
import {
  validatePhoneNumber,
  normalizePhoneForCashfree,
} from "@/lib/validation";

interface ContactDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { mobileNumber: string; email: string }) => void;
  isSubmitting?: boolean;
}

export function ContactDetailsDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: ContactDetailsDialogProps) {
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{
    mobileNumber?: string;
    email?: string;
  }>({});
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  const validateForm = () => {
    const newErrors: { mobileNumber?: string; email?: string } = {};

    const trimmedMobile = mobileNumber.trim();
    if (!trimmedMobile) {
      newErrors.mobileNumber = "Mobile number is required";
    } else {
      const phoneError = validatePhoneNumber(trimmedMobile);
      if (phoneError) {
        newErrors.mobileNumber = phoneError;
      }
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const normalizedPhone = normalizePhoneForCashfree(mobileNumber.trim());
      onSubmit({
        mobileNumber: normalizedPhone,
        email: email.trim(),
      });
    }
  };

  const handleClose = () => {
    setMobileNumber("");
    setEmail("");
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={handleClose}
      />

      {/* Bottom sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-secondary-cream rounded-t-3xl shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold font-heading text-text-teal">
              Almost there! 🎵
            </h3>
            <p className="text-[12px] text-text-teal/50 mt-0.5">
              Last step — where should we send your song?
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors mt-0.5 flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-text-teal" />
          </button>
        </div>

        {/* WhatsApp highlight */}
        <div className="mx-5 mt-4 px-4 py-3 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-green-700">
              We&apos;ll send your song on WhatsApp
            </p>
            <p className="text-[11px] text-green-600/80">
              As soon as it&apos;s ready — usually within minutes
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 pt-5 pb-8 space-y-4">
          {/* WhatsApp number — floating label */}
          <div>
            <div
              className={`relative rounded-2xl border-2 bg-white px-4 pt-6 pb-3.5 transition-all duration-200 ${
                errors.mobileNumber
                  ? "border-red-400"
                  : phoneFocused
                    ? "border-primary-yellow"
                    : mobileNumber.trim()
                      ? "border-accent-coral/35"
                      : "border-text-teal/15"
              }`}
            >
              <label className="absolute -top-[11px] left-4 flex items-center gap-1 bg-secondary-cream px-1.5">
                <span
                  className={`text-sm font-semibold ${errors.mobileNumber ? "text-red-500" : "text-text-teal/70"}`}
                >
                  WhatsApp Number
                </span>
                <span className="text-accent-coral text-sm font-bold">*</span>
              </label>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d\s+\-()]/g, "");
                  setMobileNumber(value);
                  if (errors.mobileNumber)
                    setErrors({ ...errors, mobileNumber: undefined });
                }}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                placeholder="9876543210 or +919876543210"
                maxLength={15}
                className="w-full bg-transparent text-base font-semibold text-text-teal placeholder-text-teal/40 outline-none"
                autoFocus
              />
            </div>
            {errors.mobileNumber && (
              <p className="mt-1.5 text-xs text-red-500 font-medium px-1">
                ⚠ {errors.mobileNumber}
              </p>
            )}
          </div>

          {/* Email — floating label (optional) */}
          <div>
            <div
              className={`relative rounded-2xl border-2 bg-white px-4 pt-6 pb-3.5 transition-all duration-200 ${
                errors.email
                  ? "border-red-400"
                  : emailFocused
                    ? "border-primary-yellow"
                    : "border-text-teal/15"
              }`}
            >
              <label className="absolute -top-[11px] left-4 flex items-center gap-1.5 bg-secondary-cream px-1.5">
                <span className="text-sm font-semibold text-text-teal/70">
                  Email Address
                </span>
                <span className="text-[10px] text-text-teal/35 font-medium bg-gray-100 px-1.5 rounded-full">
                  Optional
                </span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="your@email.com"
                className="w-full bg-transparent text-base font-semibold text-text-teal placeholder-text-teal/40 outline-none"
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-500 font-medium px-1">
                ⚠ {errors.email}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 bg-accent-coral text-white rounded-full transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 mt-2"
            style={{ boxShadow: "0 6px 24px rgba(239,71,111,0.45)" }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 text-white animate-spin" />
                <span className="text-base font-bold text-white">
                  Creating your song...
                </span>
              </>
            ) : (
              <>
                <span className="text-base font-bold text-white">
                  Create My Song
                </span>
                <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.5} />
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-text-teal/35 pt-1">
            🔒 Your details are secure and only used to deliver your song
          </p>
        </form>
      </div>
    </div>
  );
}

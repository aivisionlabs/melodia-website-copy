"use client";

import { Check, MessageCircle } from "lucide-react";

export function CreatePagePhoneSection({
  mobileNumber,
  onMobileNumberChange,
  phoneFocused,
  onPhoneFocus,
  onPhoneBlur,
  mobileError,
}: {
  mobileNumber: string;
  onMobileNumberChange: (value: string) => void;
  phoneFocused: boolean;
  onPhoneFocus: () => void;
  onPhoneBlur: () => void;
  mobileError?: string;
}) {
  return (
    <div className="mt-7">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
        <h2 className="text-base font-bold font-heading text-text-teal">
          Your Mobile Number
        </h2>
      </div>

      <div className="relative mb-5">
        <div
          className={`relative rounded-2xl border-2 bg-white px-4 pt-5 pb-3 transition-all duration-200 ${
            mobileError
              ? "border-red-400"
              : phoneFocused
                ? "border-primary-yellow"
                : mobileNumber.trim()
                  ? "border-accent-coral/40"
                  : "border-text-teal/15"
          }`}
        >
          <label
            htmlFor="create-flow-phone"
            className="absolute -top-[11px] left-4 flex items-center gap-1.5 bg-secondary-cream px-1.5"
          >
            <span
              className={`text-xs font-semibold ${mobileError ? "text-red-500" : "text-text-teal/65"}`}
            >
              WhatsApp Number
            </span>
            <span className="text-accent-coral text-xs font-bold">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="create-flow-phone"
              name="tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={mobileNumber}
              onChange={(e) => onMobileNumberChange(e.target.value)}
              onFocus={onPhoneFocus}
              onBlur={onPhoneBlur}
              placeholder="9876543210 or +919876543210"
              maxLength={15}
              className="flex-1 bg-transparent text-sm text-text-teal placeholder-text-teal/35 outline-none"
            />
            {mobileNumber.trim().length >= 10 && !mobileError && (
              <div className="w-5 h-5 rounded-full bg-accent-coral/15 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-accent-coral" strokeWidth={3} />
              </div>
            )}
          </div>
        </div>
        {mobileError && (
          <p className="mt-1.5 text-xs text-red-500 font-medium px-1">
            ⚠ {mobileError}
          </p>
        )}
      </div>
    </div>
  );
}

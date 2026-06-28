"use client";

import type { RefObject } from "react";
import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import {
  DEFAULT_RECIPIENT_LABEL,
  DEFAULT_RECIPIENT_LABEL_NAME_ONLY,
  OCCASION_RECIPIENT_LABELS,
  OCCASION_RECIPIENT_LABELS_NAME_ONLY,
  getRecipientExamplesForOccasion,
  RECIPIENT_INFO_BUBBLE_NAME_ONLY,
} from "./create-page-constants";
import { InfoBubble } from "./info-bubble";

export function CreatePageRecipientSection({
  recipientRef,
  effectiveOccasion,
  recipientDetails,
  onRecipientChange,
  recipientFocused,
  onRecipientFocus,
  onRecipientBlur,
  recipientError,
  nameOnlyRecipient,
  autoFocus,
  embedded,
}: {
  recipientRef: RefObject<HTMLInputElement | null>;
  effectiveOccasion: string;
  recipientDetails: string;
  onRecipientChange: (value: string) => void;
  recipientFocused: boolean;
  onRecipientFocus: () => void;
  onRecipientBlur: () => void;
  recipientError?: string;
  /** NameDrop (₹199): ask for name only, not relationship */
  nameOnlyRecipient?: boolean;
  /** Focus input on mount (e.g. right after picking a NameDrop template) */
  autoFocus?: boolean;
  /** Tighter vertical spacing when placed directly under a template card */
  embedded?: boolean;
}) {
  const label =
    nameOnlyRecipient === true
      ? "Enter the recipient's name."
      : (OCCASION_RECIPIENT_LABELS[effectiveOccasion] ??
        DEFAULT_RECIPIENT_LABEL);

  const examples = useMemo(
    () =>
      getRecipientExamplesForOccasion(
        effectiveOccasion,
        nameOnlyRecipient === true,
      ),
    [effectiveOccasion, nameOnlyRecipient],
  );

  const [recipientPlaceholderIndex, setRecipientPlaceholderIndex] = useState(0);

  useEffect(() => {
    setRecipientPlaceholderIndex(0);
  }, [effectiveOccasion, nameOnlyRecipient]);

  useEffect(() => {
    const n = examples.length;
    if (n <= 1) return;
    const interval = setInterval(() => {
      setRecipientPlaceholderIndex((prev) => (prev + 1) % n);
    }, 2500);
    return () => clearInterval(interval);
  }, [examples]);

  useEffect(() => {
    if (!autoFocus) return;
    const id = requestAnimationFrame(() => {
      recipientRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [autoFocus, recipientRef]);

  const placeholder =
    examples[recipientPlaceholderIndex % examples.length] ?? examples[0];

  const infoText =
    nameOnlyRecipient === true
      ? RECIPIENT_INFO_BUBBLE_NAME_ONLY
      : "Name and relationship of the person you're gifting this song to. E.g. 'Sarah, my best friend' or 'Rohan, my brother'";

  const borderTone = recipientError
    ? "border-red-400"
    : recipientDetails.trim().length >= 2
      ? "border-accent-coral/40"
      : recipientFocused
        ? "border-primary-yellow"
        : "border-text-teal/15";

  if (embedded === true) {
    return (
      <div className="relative mt-5 mb-4 pl-0.5 pr-0.5">
        <div
          className={`rounded-2xl border-2 bg-white transition-all duration-200 px-4 pt-4 pb-3 ${borderTone}`}
        >
          <div className="mb-2 flex items-start gap-1.5">
            <label
              htmlFor="create-recipient-name-embedded"
              className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5"
            >
              <span
                className={`text-xs font-semibold leading-snug ${
                  recipientError ? "text-red-500" : "text-text-teal/65"
                }`}
              >
                {label}
              </span>
              <span className="text-accent-coral text-xs font-bold">*</span>
              <InfoBubble text={infoText} />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="create-recipient-name-embedded"
              ref={recipientRef}
              type="text"
              value={recipientDetails}
              onChange={(e) => onRecipientChange(e.target.value)}
              onFocus={onRecipientFocus}
              onBlur={onRecipientBlur}
              placeholder={placeholder}
              autoFocus={autoFocus === true}
              className="min-w-0 flex-1 bg-transparent text-sm text-text-teal placeholder-text-teal/35 outline-none"
            />
            {recipientDetails.trim().length >= 2 && (
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent-coral/15">
                <Check className="h-3 w-3 text-accent-coral" strokeWidth={3} />
              </div>
            )}
          </div>
        </div>
        {recipientError && (
          <p className="mt-1.5 px-1 text-xs font-medium text-red-500">
            ⚠ {recipientError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative mt-7 mb-7">
      <div
        className={`relative rounded-2xl border-2 bg-white transition-all duration-200 px-4 pt-5 pb-3 ${borderTone}`}
      >
        <label className="absolute -top-[11px] left-4 flex items-center gap-1.5 bg-secondary-cream px-1.5">
          <span
            className={`text-xs font-semibold ${
              recipientError ? "text-red-500" : "text-text-teal/65"
            }`}
          >
            {label}
          </span>
          <span className="text-accent-coral text-xs font-bold">*</span>
          <InfoBubble text={infoText} />
        </label>

        <div className="flex items-center gap-2">
          <input
            ref={recipientRef}
            type="text"
            value={recipientDetails}
            onChange={(e) => onRecipientChange(e.target.value)}
            onFocus={onRecipientFocus}
            onBlur={onRecipientBlur}
            placeholder={placeholder}
            autoFocus={autoFocus === true}
            className="flex-1 bg-transparent text-sm text-text-teal placeholder-text-teal/35 outline-none"
          />
          {recipientDetails.trim().length >= 2 && (
            <div className="w-5 h-5 rounded-full bg-accent-coral/15 flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-accent-coral" strokeWidth={3} />
            </div>
          )}
        </div>
      </div>

      {recipientError && (
        <p className="mt-1.5 text-xs text-red-500 font-medium px-1">
          ⚠ {recipientError}
        </p>
      )}
    </div>
  );
}

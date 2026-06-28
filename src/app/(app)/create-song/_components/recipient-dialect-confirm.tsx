"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Pencil } from "lucide-react";
import { trackFunnelEvent } from "@/lib/analytics";
import {
  firstTransliterableLanguage,
  isTransliterableLanguage,
  TRANSLITERABLE_LANGUAGES,
} from "@/lib/transliteration-languages";

interface TransliterateApiResponse {
  success: boolean;
  primary?: string;
  alternates?: string[];
  script?: string;
  transliterated?: boolean;
}

interface RecipientDialectConfirmProps {
  name: string;
  defaultLanguage?: string;
  confirmedValue: string;
  confirmedLanguage: string;
  onConfirm: (value: string, language: string) => void;
  className?: string;
}

const MIN_NAME_LENGTH = 2;
const DEFAULT_LANGUAGE = "Hindi";

function resolveInitialLanguage(
  confirmedLanguage: string,
  defaultLanguage?: string,
): string {
  if (isTransliterableLanguage(confirmedLanguage)) return confirmedLanguage;
  return (
    firstTransliterableLanguage(defaultLanguage ?? "") ?? DEFAULT_LANGUAGE
  );
}

export function RecipientDialectConfirm({
  name,
  defaultLanguage,
  confirmedValue,
  confirmedLanguage,
  onConfirm,
  className,
}: RecipientDialectConfirmProps) {
  const trimmedName = name.trim();
  const [language, setLanguage] = useState(() =>
    resolveInitialLanguage(confirmedLanguage, defaultLanguage),
  );
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualValue, setManualValue] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);

  const tooShort = trimmedName.length < MIN_NAME_LENGTH;

  const languageOptions = (() => {
    const suggested = firstTransliterableLanguage(defaultLanguage ?? "");
    if (!suggested) return [...TRANSLITERABLE_LANGUAGES];
    return [
      suggested,
      ...TRANSLITERABLE_LANGUAGES.filter((lang) => lang !== suggested),
    ];
  })() as string[];

  // Keep language in sync when defaultLanguage changes externally.
  const prevDefaultRef = useRef(defaultLanguage);
  useEffect(() => {
    if (prevDefaultRef.current === defaultLanguage) return;
    prevDefaultRef.current = defaultLanguage;
    const next = firstTransliterableLanguage(defaultLanguage ?? "");
    if (next && next !== language) {
      setLanguage(next);
    }
  }, [defaultLanguage, language]);

  // Reset when name changes
  useEffect(() => {
    abortControllerRef.current?.abort();
    setCandidates([]);
    setLoading(false);
    setHasFetched(false);
    setManualMode(false);
    setManualValue("");
  }, [trimmedName]);

  if (tooShort) return null;

  const isEnglishKept =
    confirmedLanguage === language && confirmedValue.trim() === trimmedName;

  const fetchCandidates = async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setHasFetched(true);

    try {
      const res = await fetch("/api/transliterate-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, language }),
        signal: controller.signal,
      });
      const json: TransliterateApiResponse = await res.json();

      if (!json.success || !json.transliterated || !json.primary) {
        setCandidates([]);
        return;
      }
      const list = [json.primary, ...(json.alternates ?? [])];
      setCandidates(list);
      trackFunnelEvent.recipientNameScriptConfirm(language, "transliterated");
      onConfirm(json.primary, language);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setCandidates([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleKeepEnglish = () => {
    trackFunnelEvent.recipientNameScriptConfirm(language, "english_kept");
    onConfirm(trimmedName, language);
  };

  const handlePickCandidate = (candidate: string) => {
    trackFunnelEvent.recipientNameScriptConfirm(language, "alternate");
    onConfirm(candidate, language);
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    // Reset so user re-fetches for the new language
    setCandidates([]);
    setHasFetched(false);
    setManualMode(false);
  };

  const handleManualSave = () => {
    const value = manualValue.trim();
    if (value) {
      trackFunnelEvent.recipientNameScriptConfirm(language, "manual");
      onConfirm(value, language);
      setCandidates((prev) => (prev.includes(value) ? prev : [value, ...prev]));
    }
    setManualMode(false);
  };

  return (
    <div className={className}>
      <p className="text-sm font-medium text-text-teal mb-3">
        The singer will pronounce{" "}
        <span className="font-bold">&ldquo;{trimmedName}&rdquo;</span> — choose how it should sound:
      </p>

      {/* Language selector */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-text-teal/60">Language:</span>
        <div className="relative inline-flex items-center">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="appearance-none cursor-pointer rounded-full border border-text-teal/30 bg-transparent py-1 pl-3 pr-7 text-sm font-semibold text-text-teal focus:border-text-teal focus:outline-none"
          >
            {languageOptions.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-text-teal/50" />
        </div>
      </div>

      {/* Pre-fetch: show action button */}
      {!hasFetched && !loading && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={fetchCandidates}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-coral px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-coral/90 transition-colors"
          >
            See how it&apos;s written in {language}
          </button>
          <button
            type="button"
            onClick={handleKeepEnglish}
            className={`w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
              isEnglishKept
                ? "border-accent-coral bg-accent-coral/10 text-accent-coral"
                : "border-text-teal/20 text-text-teal/60 hover:border-text-teal/40 hover:text-text-teal"
            }`}
          >
            Keep &ldquo;{trimmedName}&rdquo; in English
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 py-2 text-sm text-text-teal/60">
          <Loader2 className="h-4 w-4 animate-spin" />
          Writing &ldquo;{trimmedName}&rdquo; in {language}…
        </div>
      )}

      {/* Post-fetch: candidates */}
      {hasFetched && !loading && (
        <>
          {manualMode ? (
            <div className="flex items-center gap-2">
              <input
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder={candidates[0] ?? trimmedName}
                autoFocus
                className="min-w-0 flex-1 border-0 border-b-2 border-text-teal bg-transparent p-0 pb-1.5 text-2xl font-extrabold text-text-teal placeholder:text-text-teal/25 focus:border-primary-yellow focus:outline-none focus:ring-0"
              />
              <button
                type="button"
                onClick={handleManualSave}
                className="shrink-0 rounded-full bg-accent-coral px-4 py-2 text-xs font-bold text-white"
              >
                Save
              </button>
            </div>
          ) : candidates.length > 0 ? (
            <>
              <p className="text-xs text-text-teal/50 mb-2">Pick the spelling that sounds right:</p>
              <div className="flex flex-wrap gap-2">
                {candidates.map((candidate) => {
                  const selected =
                    confirmedLanguage === language &&
                    confirmedValue.trim() === candidate;
                  return (
                    <button
                      key={candidate}
                      type="button"
                      onClick={() => handlePickCandidate(candidate)}
                      className={`flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-lg font-bold transition-colors ${
                        selected
                          ? "border-accent-coral bg-accent-coral text-white"
                          : "border-surface-container-high bg-surface-container-high text-text-teal"
                      }`}
                    >
                      {selected && <Check className="h-4 w-4" />}
                      {candidate}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setManualValue(confirmedValue.trim() || candidates[0]);
                    setManualMode(true);
                  }}
                  className="inline-flex items-center gap-1 text-text-teal/70 hover:text-text-teal"
                >
                  <Pencil className="h-3 w-3" />
                  Type it myself
                </button>
                <button
                  type="button"
                  onClick={handleKeepEnglish}
                  className={`hover:text-text-teal ${
                    isEnglishKept ? "text-accent-coral" : "text-text-teal/70"
                  }`}
                >
                  Keep &ldquo;{trimmedName}&rdquo; in English
                </button>
              </div>
            </>
          ) : (
            /* Fetch returned no results */
            <div className="space-y-2">
              <p className="text-xs text-text-teal/50">
                We couldn&apos;t auto-generate a {language} spelling. Type it yourself or keep the English spelling.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setManualValue(confirmedValue.trim());
                    setManualMode(true);
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-text-teal/20 px-4 py-2.5 text-sm font-semibold text-text-teal hover:border-text-teal/40"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Type in {language}
                </button>
                <button
                  type="button"
                  onClick={handleKeepEnglish}
                  className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                    isEnglishKept
                      ? "border-accent-coral bg-accent-coral/10 text-accent-coral"
                      : "border-text-teal/20 text-text-teal hover:border-text-teal/40"
                  }`}
                >
                  Keep in English
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

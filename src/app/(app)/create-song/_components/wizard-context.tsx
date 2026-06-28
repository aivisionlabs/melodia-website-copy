"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getOccasionLabelById,
  OCCASION_OPTIONS,
} from "@/lib/occasion-suggestions";

const STORAGE_KEY = "createSongWizardState";

export interface CreateSongWizardState {
  recipientName: string;
  /** User-confirmed recipient name in native script (e.g. Devanagari). */
  recipientNameInScript: string;
  /** Language whose script `recipientNameInScript` was confirmed for. */
  recipientNameScriptLang: string;
  customerMobileNumber: string;
  story: string;
  languages: string[];
  languagePreferences: string;
  /** Selected music vibe moods (e.g. "Upbeat", "Soothing"). */
  moods: string[];
  selectedTemplateId: number | null;
  occasionLabel: string;
  occasionSlug: string | null;
}

interface CreateSongWizardContextValue {
  state: CreateSongWizardState;
  isHydrated: boolean;
  setRecipientName: (value: string) => void;
  setRecipientNameInScript: (value: string, language: string) => void;
  setCustomerMobileNumber: (value: string) => void;
  setStory: (value: string) => void;
  setLanguages: (value: string[]) => void;
  setLanguagePreferences: (value: string) => void;
  toggleLanguage: (value: string) => void;
  toggleMood: (value: string) => void;
  setSelectedTemplateId: (value: number | null) => void;
  setOccasion: (label: string, slug: string | null) => void;
}

const DEFAULT_OCCASION = OCCASION_OPTIONS[0]!;
const DEFAULT_OCCASION_LABEL = DEFAULT_OCCASION.label;
const DEFAULT_OCCASION_SLUG = DEFAULT_OCCASION.id;

const defaultState: CreateSongWizardState = {
  recipientName: "",
  recipientNameInScript: "",
  recipientNameScriptLang: "",
  customerMobileNumber: "",
  story: "",
  languages: [],
  languagePreferences: "",
  moods: [],
  selectedTemplateId: null,
  occasionLabel: DEFAULT_OCCASION_LABEL,
  occasionSlug: DEFAULT_OCCASION_SLUG,
};

const CreateSongWizardContext = createContext<
  CreateSongWizardContextValue | undefined
>(undefined);

function getOccasionLabelFromSlug(slug?: string | null): string {
  if (!slug) return DEFAULT_OCCASION_LABEL;
  return getOccasionLabelById(slug) ?? DEFAULT_OCCASION_LABEL;
}

export function CreateSongWizardProvider({
  initialOccasionSlug,
  children,
}: {
  initialOccasionSlug?: string | null;
  children: ReactNode;
}) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [state, setState] = useState<CreateSongWizardState>(() => {
    if (!initialOccasionSlug) return defaultState;
    return {
      ...defaultState,
      occasionSlug: initialOccasionSlug,
      occasionLabel: getOccasionLabelFromSlug(initialOccasionSlug),
    };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nextState = { ...state };
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<CreateSongWizardState>;
        if (typeof parsed.recipientName === "string") {
          nextState.recipientName = parsed.recipientName;
        }
        if (typeof parsed.recipientNameInScript === "string") {
          nextState.recipientNameInScript = parsed.recipientNameInScript;
        }
        if (typeof parsed.recipientNameScriptLang === "string") {
          nextState.recipientNameScriptLang = parsed.recipientNameScriptLang;
        }
        if (typeof parsed.customerMobileNumber === "string") {
          nextState.customerMobileNumber = parsed.customerMobileNumber;
        }
        if (typeof parsed.story === "string") {
          nextState.story = parsed.story;
        }
        if (Array.isArray(parsed.languages)) {
          nextState.languages = parsed.languages.filter(
            (item): item is string => typeof item === "string" && item.length > 0,
          );
        }
        if (typeof parsed.languagePreferences === "string") {
          nextState.languagePreferences = parsed.languagePreferences;
        }
        if (Array.isArray(parsed.moods)) {
          nextState.moods = parsed.moods.filter(
            (item): item is string => typeof item === "string" && item.length > 0,
          );
        }
        if (
          typeof parsed.selectedTemplateId === "number" ||
          parsed.selectedTemplateId === null
        ) {
          nextState.selectedTemplateId = parsed.selectedTemplateId ?? null;
        }
        if (typeof parsed.occasionLabel === "string" && parsed.occasionLabel) {
          nextState.occasionLabel = parsed.occasionLabel;
        }
        if (typeof parsed.occasionSlug === "string" || parsed.occasionSlug === null) {
          nextState.occasionSlug = parsed.occasionSlug ?? null;
        }
      } catch {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    }

    if (initialOccasionSlug) {
      nextState.occasionSlug = initialOccasionSlug;
      nextState.occasionLabel = getOccasionLabelFromSlug(initialOccasionSlug);
    }

    setState(nextState);
    setIsHydrated(true);
    // We intentionally hydrate once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [isHydrated, state]);

  const setRecipientName = useCallback((value: string) => {
    setState((prev) =>
      prev.recipientName === value
        ? prev
        : {
            ...prev,
            recipientName: value,
            // Editing the name invalidates any previously confirmed script.
            recipientNameInScript: "",
            recipientNameScriptLang: "",
          },
    );
  }, []);

  const setRecipientNameInScript = useCallback(
    (value: string, language: string) => {
      setState((prev) => ({
        ...prev,
        recipientNameInScript: value,
        recipientNameScriptLang: language,
      }));
    },
    [],
  );

  const setCustomerMobileNumber = useCallback((value: string) => {
    setState((prev) => ({ ...prev, customerMobileNumber: value }));
  }, []);

  const setStory = useCallback((value: string) => {
    setState((prev) => ({ ...prev, story: value }));
  }, []);

  const setLanguages = useCallback((value: string[]) => {
    setState((prev) => ({ ...prev, languages: value }));
  }, []);

  const setLanguagePreferences = useCallback((value: string) => {
    setState((prev) => ({ ...prev, languagePreferences: value }));
  }, []);

  const toggleLanguage = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      languages: prev.languages.includes(value)
        ? prev.languages.filter((item) => item !== value)
        : [...prev.languages, value],
    }));
  }, []);

  const toggleMood = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      moods: prev.moods.includes(value)
        ? prev.moods.filter((item) => item !== value)
        : [...prev.moods, value],
    }));
  }, []);

  const setSelectedTemplateId = useCallback((value: number | null) => {
    setState((prev) => ({ ...prev, selectedTemplateId: value }));
  }, []);

  const setOccasion = useCallback((label: string, slug: string | null) => {
    setState((prev) => ({
      ...prev,
      occasionLabel: label,
      occasionSlug: slug,
    }));
  }, []);

  const contextValue = useMemo(
    () => ({
      state,
      isHydrated,
      setRecipientName,
      setRecipientNameInScript,
      setCustomerMobileNumber,
      setStory,
      setLanguages,
      setLanguagePreferences,
      toggleLanguage,
      toggleMood,
      setSelectedTemplateId,
      setOccasion,
    }),
    [
      state,
      isHydrated,
      setRecipientName,
      setRecipientNameInScript,
      setCustomerMobileNumber,
      setStory,
      setLanguages,
      setLanguagePreferences,
      toggleLanguage,
      toggleMood,
      setSelectedTemplateId,
      setOccasion,
    ],
  );

  return (
    <CreateSongWizardContext.Provider value={contextValue}>
      {children}
    </CreateSongWizardContext.Provider>
  );
}

export function useCreateSongWizard() {
  const context = useContext(CreateSongWizardContext);
  if (!context) {
    throw new Error(
      "useCreateSongWizard must be used inside CreateSongWizardProvider",
    );
  }
  return context;
}

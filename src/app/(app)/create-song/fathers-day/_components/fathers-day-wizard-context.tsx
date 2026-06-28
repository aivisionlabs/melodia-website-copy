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

const STORAGE_KEY = "fathersDayWizardState";

export const TOTAL_STEPS = 5;

export interface FathersDayWizardState {
  currentStep: number;
  // Step 1
  title: string;
  // Step 2
  musicalVibe: string;
  // Step 3
  superpower: string;
  catchphrase: string;
  // Step 4
  hometown: string;
  currentCity: string;
  // Step 5
  languages: string[];
  languagePreferences: string;
  // Payment
  customerMobileNumber: string;
}

interface FathersDayWizardContextValue {
  state: FathersDayWizardState;
  isHydrated: boolean;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setTitle: (value: string) => void;
  setMusicalVibe: (value: string) => void;
  setSuperpower: (value: string) => void;
  setCatchphrase: (value: string) => void;
  setHometown: (value: string) => void;
  setCurrentCity: (value: string) => void;
  toggleLanguage: (lang: string) => void;
  setLanguagePreferences: (value: string) => void;
  setCustomerMobileNumber: (value: string) => void;
}

const defaultState: FathersDayWizardState = {
  currentStep: 1,
  title: "",
  musicalVibe: "",
  superpower: "",
  catchphrase: "",
  hometown: "",
  currentCity: "",
  languages: [],
  languagePreferences: "",
  customerMobileNumber: "",
};

const FathersDayWizardContext = createContext<
  FathersDayWizardContextValue | undefined
>(undefined);

export function FathersDayWizardProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [state, setState] = useState<FathersDayWizardState>(defaultState);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<FathersDayWizardState>;
        setState((prev) => ({
          ...prev,
          ...(typeof parsed.title === "string" && { title: parsed.title }),
          ...(typeof parsed.musicalVibe === "string" && { musicalVibe: parsed.musicalVibe }),
          ...(typeof parsed.superpower === "string" && { superpower: parsed.superpower }),
          ...(typeof parsed.catchphrase === "string" && { catchphrase: parsed.catchphrase }),
          ...(typeof parsed.hometown === "string" && { hometown: parsed.hometown }),
          ...(typeof parsed.currentCity === "string" && { currentCity: parsed.currentCity }),
          ...(Array.isArray(parsed.languages) && { languages: parsed.languages }),
          ...(typeof parsed.languagePreferences === "string" && { languagePreferences: parsed.languagePreferences }),
          ...(typeof parsed.customerMobileNumber === "string" && { customerMobileNumber: parsed.customerMobileNumber }),
        }));
      } catch {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [isHydrated, state]);

  const goToStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS),
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }));
  }, []);

  const setTitle = useCallback((value: string) => {
    setState((prev) => ({ ...prev, title: value }));
  }, []);

  const setMusicalVibe = useCallback((value: string) => {
    setState((prev) => ({ ...prev, musicalVibe: value }));
  }, []);

  const setSuperpower = useCallback((value: string) => {
    setState((prev) => ({ ...prev, superpower: value }));
  }, []);

  const setCatchphrase = useCallback((value: string) => {
    setState((prev) => ({ ...prev, catchphrase: value }));
  }, []);

  const setHometown = useCallback((value: string) => {
    setState((prev) => ({ ...prev, hometown: value }));
  }, []);

  const setCurrentCity = useCallback((value: string) => {
    setState((prev) => ({ ...prev, currentCity: value }));
  }, []);

  const toggleLanguage = useCallback((lang: string) => {
    setState((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }));
  }, []);

  const setLanguagePreferences = useCallback((value: string) => {
    setState((prev) => ({ ...prev, languagePreferences: value }));
  }, []);

  const setCustomerMobileNumber = useCallback((value: string) => {
    setState((prev) => ({ ...prev, customerMobileNumber: value }));
  }, []);

  const contextValue = useMemo(
    () => ({
      state,
      isHydrated,
      goToStep,
      nextStep,
      prevStep,
      setTitle,
      setMusicalVibe,
      setSuperpower,
      setCatchphrase,
      setHometown,
      setCurrentCity,
      toggleLanguage,
      setLanguagePreferences,
      setCustomerMobileNumber,
    }),
    [
      state,
      isHydrated,
      goToStep,
      nextStep,
      prevStep,
      setTitle,
      setMusicalVibe,
      setSuperpower,
      setCatchphrase,
      setHometown,
      setCurrentCity,
      toggleLanguage,
      setLanguagePreferences,
      setCustomerMobileNumber,
    ],
  );

  return (
    <FathersDayWizardContext.Provider value={contextValue}>
      {children}
    </FathersDayWizardContext.Provider>
  );
}

export function useFathersDayWizard() {
  const context = useContext(FathersDayWizardContext);
  if (!context) {
    throw new Error("useFathersDayWizard must be used inside FathersDayWizardProvider");
  }
  return context;
}

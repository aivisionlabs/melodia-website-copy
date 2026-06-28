"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { User } from "@/types";
import { signIn, signOut } from "next-auth/react";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (
    email: string,
    password: string,
    anonymousId?: string | null
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    dateOfBirth: string,
    phoneNumber?: string,
    anonymousId?: string | null
  ) => Promise<{
    success: boolean;
    error?: string;
    fieldErrors?: Record<string, string>;
  }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false,
  });

  // Fetch user data from API - JWT cookie is the source of truth
  const fetchUserData = useCallback(async (): Promise<User | null> => {
    try {
      // Try to get full user data from /api/users/me first
      const response = await fetch("/api/users/me", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          return {
            id: data.user.id.toString(),
            email: data.user.email,
            name: data.user.name,
            email_verified: data.user.email_verified,
            date_of_birth: data.user.date_of_birth || null,
            phone_number: data.user.phone_number || null,
            profile_picture: data.user.profile_picture || null,
            created_at: data.user.created_at || null,
            updated_at: data.user.updated_at || null,
          };
        }
      }
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  }, []);

  // Initialize auth state
  const initializeAuth = useCallback(async () => {
    try {
      const user = await fetchUserData();

      // If user is authenticated, clear anonymous user ID from localStorage
      // (merge is complete, so anonymous session is no longer needed)
      if (user) {
        localStorage.removeItem("anonymous_user_id");
      }

      setAuthState({
        user,
        loading: false,
        error: null,
        isAuthenticated: !!user,
      });
    } catch (error) {
      console.error("Auth initialization error:", error);
      setAuthState({
        user: null,
        loading: false,
        error: "Failed to check authentication status",
        isAuthenticated: false,
      });
    }
  }, [fetchUserData]);

  // Initialize on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = useCallback(
    async (email: string, password: string, anonymousId?: string | null) => {
      try {
        const result = await signIn("credentials", {
          redirect: false,
          email,
          password,
          anonymousId: anonymousId || "",
        });

        if (result?.error) {
          return { success: false, error: result.error };
        }

        if (result?.ok) {
          // Clear anonymous user ID from localStorage after successful merge
          if (anonymousId) {
            localStorage.removeItem("anonymous_user_id");
          }
          await initializeAuth();
          return { success: true };
        }

        return { success: false, error: "Login failed" };
      } catch (error) {
        return { success: false, error: "An unexpected error occurred." };
      }
    },
    [initializeAuth]
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      dateOfBirth: string,
      phoneNumber?: string,
      anonymousId?: string | null
    ) => {
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            dateOfBirth,
            phoneNumber: phoneNumber || undefined,
            anonymousId: anonymousId || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle field-specific errors
          if (data.fieldErrors) {
            return {
              success: false,
              error: data.error || "Invalid input",
              fieldErrors: data.fieldErrors,
            };
          }
          return { success: false, error: data.error || "Registration failed" };
        }

        return { success: true };
      } catch (error) {
        return { success: false, error: "An unexpected error occurred." };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      // Call logout API to clear all cookies (including anonymous cookie)
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Clear NextAuth session
      await signOut({ redirect: false });

      // Update auth state
      setAuthState({
        user: null,
        loading: false,
        error: null,
        isAuthenticated: false,
      });

      // Clear anonymous user ID from localStorage if present
      localStorage.removeItem("anonymous_user_id");

      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false, error: "Logout failed" };
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    await initializeAuth();
  }, [initializeAuth]);

  // Clear error
  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    refreshUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

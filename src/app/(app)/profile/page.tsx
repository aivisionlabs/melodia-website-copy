"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { FormField } from "@/components/forms/FormField";
import { PasswordField } from "@/components/forms/PasswordField";
import { GoogleAuthButton } from "@/components/forms/GoogleAuthButton";
import { AuthMessageDisplay } from "@/components/auth/AuthMessageDisplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import { trackAuthEvent } from "@/lib/analytics";

// Single Responsibility: Component handles profile page with login/signup and authenticated view
export default function ProfilePage() {
  const { data: session, status } = useSession();
  const {
    user,
    error,
    isAuthenticated,
    loading,
    login,
    logout,
    clearError,
    refreshUser,
  } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    phoneNumber: "",
    dateOfBirth: "",
    profilePicture: null as string | null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);

  // Form state for login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  // Fetch user data when authenticated
  useEffect(() => {
    const fetchUserData = async () => {
      if ((isAuthenticated && user) || status === "authenticated") {
        try {
          const response = await fetch("/api/users/me", {
            credentials: "include",
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              setUserData(data.user);
              setProfileData({
                name: data.user.name || "",
                phoneNumber: data.user.phone_number || "",
                dateOfBirth: data.user.date_of_birth || "",
                profilePicture: data.user.profile_picture || null,
              });
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();
  }, [isAuthenticated, user, status]);

  // Clear errors when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      // Clear auth errors and form errors when leaving the page
      clearError();
      setFormError(null);
    };
  }, [clearError]);

  // Form handlers for login
  const handleEmailChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setEmail(e.target.value);
    // Clear all errors when user starts typing
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
    if (formError) {
      setFormError(null);
    }
    if (error) {
      clearError();
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    // Clear all errors when user starts typing
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
    if (formError) {
      setFormError(null);
    }
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setErrors({});

    // Basic validation
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!password.trim()) {
      newErrors.password = "Password is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      // For credentials login, pass anonymousId directly to server via NextAuth credentials
      const anonymousId =
        localStorage.getItem("anonymous_user_id") || undefined;
      const result = await login(email, password, anonymousId);
      if (result.success) {
        // Clear form
        setEmail("");
        setPassword("");
      } else {
        setFormError(result.error || "Login failed. Please try again.");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear errors when user focuses on form fields
  const handleFormFocus = () => {
    if (formError) setFormError(null);
    if (error) clearError();
  };

  // Profile editing handlers
  const handleEditClick = () => {
    setIsEditing(true);
    setSaveMessage(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveMessage(null);
    // Reset form data to current user data
    if (userData) {
      setProfileData({
        name: userData.name || "",
        phoneNumber: userData.phone_number || "",
        dateOfBirth: userData.date_of_birth || "",
        profilePicture: userData.profile_picture || null,
      });
    }
  };

  const handleProfilePictureChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Convert file to base64 for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setProfileData((prev) => ({ ...prev, profilePicture: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    // Basic validation
    if (!profileData.name.trim()) {
      setSaveMessage("Name is required");
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: profileData.name.trim(),
          phone_number: profileData.phoneNumber.trim() || null,
          date_of_birth: profileData.dateOfBirth || null,
          profile_picture: profileData.profilePicture || null,
        }),
      });

      const data = await res.json();

      if (data?.success) {
        setSaveMessage("Profile updated successfully!");
        setUserData(data.user);
        // Refresh user data in auth context
        if (refreshUser) {
          await refreshUser();
        }
        // Exit edit mode after a short delay
        setTimeout(() => {
          setIsEditing(false);
          setSaveMessage(null);
        }, 1500);
      } else {
        setSaveMessage(data?.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Save error:", error);
      setSaveMessage(
        `Failed to update profile: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary">
        <main className="flex-grow flex flex-col items-center justify-center px-6 text-center">
          <div className="text-text">Loading...</div>
        </main>
      </div>
    );
  }

  // Show authenticated view if user is logged in
  const isSessionAuthed = status === "authenticated";
  const authedUser =
    userData || user || (isSessionAuthed ? (session?.user as any) : null);

  if ((isAuthenticated && user) || isSessionAuthed) {
    const userName = authedUser?.name || "User";
    const userEmail = authedUser?.email || "";
    const userPhoneNumber = authedUser?.phone_number || "";
    const userDateOfBirth = authedUser?.date_of_birth || "";
    const userProfilePicture = authedUser?.profile_picture || null;

    return (
      <div className="min-h-screen bg-white">
        <div className="hidden md:block"><Header showCreateSongCTA /></div>
        <main className="flex-1 px-6 py-8">
          {/* Profile Picture */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div
                className={`w-32 h-32 rounded-full flex items-center justify-center overflow-hidden ${
                  userProfilePicture ? "bg-white" : "bg-gray-200"
                }`}
              >
                {userProfilePicture ? (
                  <Image
                    src={userProfilePicture}
                    alt="Profile"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover rounded-full"
                    unoptimized={userProfilePicture.startsWith("data:")}
                  />
                ) : (
                  <svg
                    className="w-16 h-16 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                )}
              </div>
              {isEditing && (
                <label className="absolute bottom-0 right-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center border-4 border-white cursor-pointer hover:bg-yellow-400 transition-colors">
                  <svg
                    className="w-5 h-5 text-text"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* User Name */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text font-display">
              {userName}
            </h1>
          </div>

          {/* View My Songs Button */}
          <div className="mb-8 flex justify-center">
            <Button
              onClick={() => router.push("/my-songs")}
              className="w-full md:w-auto md:max-w-xs h-14 bg-accent text-white font-display font-bold text-lg rounded-full shadow-md transition-colors duration-300"
            >
              View My Songs
            </Button>
          </div>

          {/* Personal Details - View Mode */}
          {!isEditing && (
            <div className="space-y-4 mb-8">
              <div className="py-3 border-b border-gray-100">
                <span className="text-text/60 font-body block mb-1">
                  Full Name
                </span>
                <span className="text-text font-bold font-body text-sm block">
                  {userName || "Not provided"}
                </span>
              </div>

              <div className="py-3 border-b border-gray-100">
                <span className="text-text/60 font-body block mb-1">
                  Date of Birth
                </span>
                <span className="text-text font-bold font-body text-sm block">
                  {userDateOfBirth
                    ? new Date(userDateOfBirth).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Not provided"}
                </span>
              </div>

              <div className="py-3 border-b border-gray-100">
                <span className="text-text/60 font-body block mb-1">
                  Email Address
                </span>
                <span className="text-text font-bold font-body text-sm block">
                  {userEmail || "Not provided"}
                </span>
              </div>

              <div className="py-3 border-b border-gray-100">
                <span className="text-text/60 font-body block mb-1">
                  Phone Number
                </span>
                <span
                  className={`font-body text-sm block ${
                    userPhoneNumber
                      ? "text-text font-bold"
                      : "text-text/60 italic"
                  }`}
                >
                  {userPhoneNumber || "Not provided"}
                </span>
              </div>
            </div>
          )}

          {/* Personal Details - Edit Mode */}
          {isEditing && (
            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-text mb-2 font-body">
                  Full Name
                </label>
                <Input
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full h-14 px-5 bg-white border border-text/20 rounded-lg placeholder-text/50 focus:ring-2 focus:ring-primary focus:border-transparent font-body"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2 font-body">
                  Date of Birth
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        dateOfBirth: e.target.value,
                      }))
                    }
                    className="w-full h-14 px-5 bg-white border border-text/20 rounded-lg placeholder-text/50 focus:ring-2 focus:ring-primary focus:border-transparent font-body"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2 font-body">
                  Email Address
                </label>
                <Input
                  value={userEmail}
                  disabled
                  className="w-full h-14 px-5 bg-gray-50 border border-text/20 rounded-lg text-text/60 font-body"
                />
                <p className="text-xs text-gray-500 mt-1 font-body">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2 font-body">
                  Phone Number
                </label>
                <Input
                  value={profileData.phoneNumber}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      phoneNumber: e.target.value,
                    }))
                  }
                  className="w-full h-14 px-5 bg-white border border-text/20 rounded-lg placeholder-text/50 focus:ring-2 focus:ring-primary focus:border-transparent font-body"
                  placeholder="Add phone number"
                />
              </div>
            </div>
          )}

          {/* Edit/Save/Cancel Buttons */}
          {!isEditing && (
            <div className="mb-8 flex justify-center">
              <Button
                onClick={handleEditClick}
                className="w-full md:w-auto md:max-w-xs h-14 bg-primary text-text font-display font-bold text-lg rounded-full shadow-md transition-colors duration-300"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit Details
              </Button>
            </div>
          )}

          {isEditing && (
            <div className="space-y-4 mb-8">
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full h-14 bg-accent text-white font-display font-bold text-lg rounded-full shadow-md hover:bg-pink-600 transition-colors duration-300 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="w-full h-14 bg-white border-2 border-text/20 text-text font-display font-bold text-lg rounded-full shadow-md hover:bg-gray-50 transition-colors duration-300 disabled:opacity-50"
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Save Message */}
          {saveMessage && (
            <div
              className={`text-sm text-center mb-4 font-body ${
                saveMessage.includes("successfully")
                  ? "text-green-600"
                  : "text-accent"
              }`}
            >
              {saveMessage}
            </div>
          )}

          <div className="mt-8 flex justify-center pb-24">
            <button
              type="button"
              onClick={async () => {
                trackAuthEvent.logout("profile_page");
                await logout();
              }}
              className="inline-flex items-center gap-1.5 text-sm text-text/45 hover:text-text/65 font-body py-1.5 transition-colors"
            >
              <svg
                className="w-4 h-4 shrink-0 opacity-80"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Logout
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Show login/signup form if not authenticated
  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header showCreateSongCTA />
      <Suspense fallback={<div>Loading messages...</div>}>
        <AuthMessageDisplay
          setSuccessMessage={setSuccessMessage}
          setFormError={setFormError}
        />
      </Suspense>
      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-sm">
          {/* Header */}
          <h1 className="font-display text-4xl font-bold text-text mb-4">
            Profile
          </h1>
          <h2 className="font-display text-2xl text-text mb-8">
            Log in or sign up
          </h2>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm font-body">
                {successMessage}
              </p>
            </div>
          )}

          {/* Error Message */}
          {(error || formError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm font-body">
                {error || formError}
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* Google Auth Button */}
            <GoogleAuthButton />

            {/* Divider */}
            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-text/20"></div>
              <span className="flex-shrink mx-4 text-text/60 font-body">
                OR
              </span>
              <div className="flex-grow border-t border-text/20"></div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={handleEmailChange}
                onFocus={handleFormFocus}
                error={errors.email}
                required
                className="w-full h-14 px-5 bg-white border border-text/20 rounded-lg placeholder-text/50 focus:ring-2 focus:ring-primary focus:border-transparent font-body"
              />

              <PasswordField
                id="password"
                placeholder="Password"
                value={password}
                onChange={handlePasswordChange}
                error={errors.password}
                required
                showPassword={showPassword}
                onToggleVisibility={() => setShowPassword(!showPassword)}
              />

              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-accent text-sm font-medium hover:underline font-body"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={!email.trim() || !password.trim() || isSubmitting}
                className="w-full h-14 bg-primary text-text font-display font-bold text-lg rounded-full shadow-md hover:bg-yellow-400 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Logging in..." : "Log In"}
              </Button>
            </form>

            {/* Sign Up Link */}
            <p className="text-center text-text/80 text-sm font-body">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-bold text-accent hover:underline"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

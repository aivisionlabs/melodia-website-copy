"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { apiPatch } from "@/lib/api-utils";

export default function EditProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { user, logout, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        setName(user.name || "");
        setEmail(user.email || "");
        setPhoneNumber(user.phone_number || "");
        setDateOfBirth(user.date_of_birth || "");
        setProfilePicture(user.profile_picture || null);
        setLoading(false);
      } else {
        // Redirect to login if not authenticated
        router.replace("/profile");
      }
    }
  }, [user, router, authLoading]);

  const save = async () => {
    setSaving(true);
    setMessage(null);

    // Basic validation
    if (!name.trim()) {
      setMessage("Name is required");
      setSaving(false);
      return;
    }

    try {
      // Use proper API endpoint with authentication
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify({
          name: name.trim(),
          phone_number: phoneNumber.trim() || null,
          date_of_birth: dateOfBirth || null,
          profile_picture: profilePicture || null,
        }),
      });

      const data = await res.json();

      if (data?.success) {
        setMessage("Profile updated successfully!");
        // Refresh user data in auth context
        if (refreshUser) {
          refreshUser();
        }
        // Redirect back to profile page after successful save
        setTimeout(() => {
          router.push("/profile");
        }, 1500);
      } else {
        console.error("API Error:", data);
        setMessage(data?.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Save error:", error);
      setMessage(
        `Failed to update profile: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setSaving(false);
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
        setProfilePicture(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/profile");
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-text">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <Link href="/profile" className="p-2 -ml-2">
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
        <h1 className="flex-1 text-center text-xl font-bold text-text font-display -ml-6">
          Edit Profile
        </h1>
        <div className="w-6"></div> {/* Spacer for centering */}
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        {/* Profile Picture */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-32 h-32 bg-orange-200 rounded-full flex items-center justify-center overflow-hidden">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <svg
                  className="w-16 h-16 text-orange-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>
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
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Full Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-14 px-5 bg-white border border-text/20 rounded-lg placeholder-text/50 focus:ring-2 focus:ring-primary focus:border-transparent font-body"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Date of Birth
            </label>
            <div className="relative">
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full h-14 px-5 bg-white border border-text/20 rounded-lg placeholder-text/50 focus:ring-2 focus:ring-primary focus:border-transparent font-body"
              />
              <svg
                className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Email Address
            </label>
            <Input
              value={email}
              disabled
              className="w-full h-14 px-5 bg-gray-50 border border-text/20 rounded-lg text-text/60 font-body"
            />
            <p className="text-xs text-gray-500 mt-1">
              A verification link will be sent to your new email address.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Phone Number
            </label>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full h-14 px-5 bg-white border border-text/20 rounded-lg placeholder-text/50 focus:ring-2 focus:ring-primary focus:border-transparent font-body"
              placeholder="Add phone number"
            />
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="mb-8">
          <Button
            onClick={save}
            disabled={saving}
            className="w-full h-14 bg-accent text-white font-display font-bold text-lg rounded-full shadow-md hover:bg-pink-600 transition-colors duration-300 disabled:opacity-50"
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
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {message && (
          <div
            className={`text-sm text-center mb-4 ${
              message.includes("successfully")
                ? "text-green-600"
                : "text-accent"
            }`}
          >
            {message}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2">
        <div className="flex justify-around items-center">
          <Link href="/" className="flex flex-col items-center py-2">
            <div className="w-6 h-6 mb-1">
              <svg
                className="w-full h-full text-text"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <span className="text-xs text-text font-body">Home</span>
          </Link>

          <Link href="/library" className="flex flex-col items-center py-2">
            <div className="w-6 h-6 mb-1">
              <svg
                className="w-full h-full text-text"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
            <span className="text-xs text-text font-body">Library</span>
          </Link>

          <Link href="/profile" className="flex flex-col items-center py-2">
            <div className="w-6 h-6 mb-1">
              <svg
                className="w-full h-full text-accent"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <span className="text-xs text-accent font-body">Profile</span>
          </Link>
        </div>
      </nav>

      {/* Bottom padding to account for fixed navigation */}
      <div className="h-20"></div>
    </div>
  );
}

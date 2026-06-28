import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Eye, Lock, Database, Users, Mail, Globe } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Melodia",
  description:
    "Read Melodia's Privacy Policy to understand how we collect, use, and protect your personal information. We are committed to protecting your privacy and keeping your data secure.",
  keywords:
    "privacy policy, melodia privacy, data protection, personal information, data security, user privacy, GDPR compliance",
  openGraph: {
    title: "Privacy Policy | Melodia",
    description:
      "Learn about how Melodia protects your privacy and handles your personal information.",
    url: "https://www.melodia-songs.com/privacy",
    siteName: "Melodia",
    images: ["/images/melodia-logo-og.jpeg"],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Melodia",
    description:
      "Learn about how Melodia protects your privacy and handles your personal information.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/privacy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="hidden md:block"><Header /></div>
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              Privacy Policy
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Your privacy is important to us. This policy explains how we
              collect, use, and protect your information.
            </p>
            <p className="text-sm text-gray-400 mt-4">
              Last updated: January 2024
            </p>
          </div>

          {/* Introduction */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Introduction
            </h2>
            <p className="text-gray-300 mb-4">
              Melodia (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is
              committed to protecting your privacy. This Privacy Policy explains
              how we collect, use, disclose, and safeguard your information when
              you use our song creation platform.
            </p>
            <p className="text-gray-300">
              By using our service, you agree to the collection and use of
              information in accordance with this policy.
            </p>
          </div>

          {/* Information We Collect */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Information We Collect
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <Database className="h-5 w-5 text-yellow-400 mr-2" />
                  Personal Information
                </h3>
                <ul className="text-gray-300 space-y-2 ml-7">
                  <li>• Name and email address when you create an account</li>
                  <li>• Contact information when you reach out to us</li>
                  <li>
                    • Payment information (processed securely through
                    third-party providers)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <Users className="h-5 w-5 text-yellow-400 mr-2" />
                  Song Creation Data
                </h3>
                <ul className="text-gray-300 space-y-2 ml-7">
                  <li>• Details about the person or occasion for your song</li>
                  <li>• Lyrics preferences and customizations</li>
                  <li>• Generated lyrics and music files</li>
                  <li>• Language preferences and additional details</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <Eye className="h-5 w-5 text-yellow-400 mr-2" />
                  Usage Information
                </h3>
                <ul className="text-gray-300 space-y-2 ml-7">
                  <li>• How you interact with our platform</li>
                  <li>• Device information and browser type</li>
                  <li>• IP address and general location data</li>
                  <li>• Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </div>
          </div>

          {/* How We Use Information */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              How We Use Your Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Service Delivery
                </h3>
                <ul className="text-gray-300 space-y-2">
                  <li>• Generate personalized songs based on your input</li>
                  <li>• Provide customer support</li>
                  <li>• Process payments and transactions</li>
                  <li>• Maintain your account and preferences</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Platform Improvement
                </h3>
                <ul className="text-gray-300 space-y-2">
                  <li>• Enhance our AI algorithms</li>
                  <li>• Improve user experience</li>
                  <li>• Analyze usage patterns</li>
                  <li>• Develop new features</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Information Sharing */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Information Sharing
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  We do NOT sell your personal information
                </h3>
                <p className="text-gray-300">
                  We may share your information only in the following limited
                  circumstances:
                </p>
              </div>

              <ul className="text-gray-300 space-y-2 ml-4">
                <li>
                  • <strong>Service Providers:</strong> With trusted third
                  parties who help us operate our platform
                </li>
                <li>
                  • <strong>Legal Requirements:</strong> When required by law or
                  to protect our rights
                </li>
                <li>
                  • <strong>Business Transfers:</strong> In connection with a
                  merger or acquisition
                </li>
                <li>
                  • <strong>Consent:</strong> When you explicitly give us
                  permission
                </li>
              </ul>
            </div>
          </div>

          {/* Data Security */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
              <Lock className="h-6 w-6 text-yellow-400 mr-2" />
              Data Security
            </h2>

            <div className="space-y-4">
              <p className="text-gray-300">
                We implement industry-standard security measures to protect your
                information:
              </p>

              <ul className="text-gray-300 space-y-2 ml-4">
                <li>• Encryption of data in transit and at rest</li>
                <li>• Regular security audits and updates</li>
                <li>• Access controls and authentication</li>
                <li>• Secure data centers and infrastructure</li>
              </ul>

              <p className="text-gray-300">
                However, no method of transmission over the internet is 100%
                secure. While we strive to protect your information, we cannot
                guarantee absolute security.
              </p>
            </div>
          </div>

          {/* Your Rights */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Your Rights
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Access & Control
                </h3>
                <ul className="text-gray-300 space-y-2">
                  <li>• View and update your account information</li>
                  <li>• Download your created songs</li>
                  <li>• Delete your account and data</li>
                  <li>• Opt-out of marketing communications</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Data Portability
                </h3>
                <ul className="text-gray-300 space-y-2">
                  <li>• Request a copy of your data</li>
                  <li>• Transfer your data to another service</li>
                  <li>• Correct inaccurate information</li>
                  <li>• Restrict certain data processing</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Cookies */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Cookies and Tracking
            </h2>

            <div className="space-y-4">
              <p className="text-gray-300">
                We use cookies and similar technologies to enhance your
                experience:
              </p>

              <ul className="text-gray-300 space-y-2 ml-4">
                <li>
                  • <strong>Essential Cookies:</strong> Required for basic
                  platform functionality
                </li>
                <li>
                  • <strong>Analytics Cookies:</strong> Help us understand how
                  you use our platform
                </li>
                <li>
                  • <strong>Preference Cookies:</strong> Remember your settings
                  and preferences
                </li>
              </ul>

              <p className="text-gray-300">
                You can control cookie settings through your browser
                preferences.
              </p>
            </div>
          </div>

          {/* Children's Privacy */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Children&apos;s Privacy
            </h2>

            <p className="text-gray-300">
              Our service is not intended for children under 13 years of age. We
              do not knowingly collect personal information from children under
              13. If you are a parent or guardian and believe your child has
              provided us with personal information, please contact us to have
              it removed.
            </p>
          </div>

          {/* International Users */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              International Users
            </h2>

            <p className="text-gray-300">
              If you are accessing our service from outside the United States,
              please be aware that your information may be transferred to,
              stored, and processed in the United States where our servers are
              located. By using our service, you consent to the transfer of your
              information to the United States.
            </p>
          </div>

          {/* Changes to Policy */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Changes to This Policy
            </h2>

            <p className="text-gray-300">
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by posting the new Privacy Policy on
              this page and updating the &quot;Last updated&quot; date. We
              encourage you to review this Privacy Policy periodically for any
              changes.
            </p>
          </div>

          {/* Contact Information */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Contact Us
            </h2>

            <p className="text-gray-300 mb-6">
              If you have any questions about this Privacy Policy or our privacy
              practices, please contact us:
            </p>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-yellow-400" />
                <span className="text-gray-300">info@melodia-songs.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-yellow-400" />
                <span className="text-gray-300">melodia-songs.com</span>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Questions About Privacy?
            </h2>
            <p className="text-xl text-yellow-100 mb-8">
              We&apos;re here to help. Contact us if you have any privacy
              concerns or questions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="bg-white text-yellow-600 px-8 py-3 rounded-full font-semibold text-lg hover:bg-gray-100 transition-colors"
              >
                Contact Us
              </Link>
              <Link
                href="/"
                className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold text-lg hover:bg-white hover:text-yellow-600 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  RefreshCw,
  Clock,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  ArrowLeft,
  Music,
  Building2,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | Melodia",
  description:
    "Read Melodia's Refund and Cancellation Policy. Learn about our fair refund practices, free re-generation guarantee, and the refund request process for personalized AI song creation services.",
  keywords:
    "refund policy, cancellation policy, melodia refund, return policy, money back guarantee, service refund, AI music refund",
  openGraph: {
    title: "Refund & Cancellation Policy | Melodia",
    description:
      "Learn about Melodia's fair and transparent refund and cancellation practices.",
    url: "https://www.melodia-songs.com/refund",
    siteName: "Melodia",
    images: ["/images/melodia-logo-og.jpeg"],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Refund & Cancellation Policy | Melodia",
    description:
      "Learn about Melodia's fair and transparent refund and cancellation practices.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "https://www.melodia-songs.com/refund",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="hidden md:block">
        <Header />
      </div>

      {/* Mobile back nav */}
      <div className="md:hidden px-4 pt-4 pb-2">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Melodia
        </Link>
      </div>

      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              Refund &amp; Cancellation Policy
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              We stand behind every song we create. If something goes wrong,
              we&apos;ll make it right. We start with a free revision, and offer
              a full refund if that still doesn&apos;t resolve it.
            </p>
            <p className="text-sm text-gray-400 mt-4">
              Last updated: June 2026
            </p>
          </div>

          {/* Our Commitment */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Our Commitment to You
            </h2>
            <p className="text-gray-300 mb-4">
              At Melodia, we pour care into every personalised song. We know
              you&apos;re creating something meaningful: a birthday, a wedding,
              a cherished memory. We take that responsibility seriously.
            </p>
            <p className="text-gray-300 mb-4">
              Every refund or revision request is reviewed by our music experts,
              not an automated system. They listen to your song, understand your
              brief, and decide the right course of action: a{" "}
              <strong className="text-white">free expert revision</strong> to
              get it exactly right, or a{" "}
              <strong className="text-white">full refund</strong> where the
              situation genuinely warrants one.
            </p>
            <p className="text-gray-300">
              We aim to resolve every case fairly and quickly, typically within
              2–5 business days of hearing from you.
            </p>
          </div>

          {/* Consumer Tabs: B2C vs B2B */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-800 rounded-lg p-6 border border-yellow-500/40">
              <div className="flex items-center mb-3">
                <Music className="h-5 w-5 text-yellow-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">
                  Individual Customers
                </h3>
              </div>
              <p className="text-gray-400 text-sm">
                Buying a personalised song for a loved one? This full policy
                applies to you. You&apos;re protected under the{" "}
                <strong className="text-gray-300">
                  Consumer Protection Act, 2019
                </strong>
                .
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-600">
              <div className="flex items-center mb-3">
                <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">
                  Partner / B2B Orders
                </h3>
              </div>
              <p className="text-gray-400 text-sm">
                For bulk or partner orders placed via our vendor API or business
                agreements, refunds are governed by your partner contract. The
                eligibility criteria below still apply as a baseline.
              </p>
            </div>
          </div>

          {/* Refund Eligibility */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Refund Eligibility
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                  Eligible for Refund
                </h3>
                <ul className="text-gray-300 space-y-2 ml-7">
                  <li>
                    • Technical failure that prevents song generation from
                    completing
                  </li>
                  <li>• Song generation does not complete within 60 minutes</li>
                  <li>
                    • Delivered song significantly deviates from the details you
                    provided
                  </li>
                  <li>• Duplicate charge caused by a system error</li>
                  <li>
                    • Service unavailable for more than 24 hours affecting your
                    order
                  </li>
                  <li>
                    • An expert revision was completed and the revised song
                    still fails to meet your submitted specifications
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <XCircle className="h-5 w-5 text-red-400 mr-2" />
                  Not Eligible for Refund
                </h3>
                <ul className="text-gray-300 space-y-2 ml-7">
                  <li>
                    • Subjective preference: the song meets your submitted
                    details but you prefer a different musical style
                  </li>
                  <li>
                    • Change of mind after the song has been successfully
                    delivered
                  </li>
                  <li>
                    • Incomplete or inaccurate input details provided at the
                    time of order
                  </li>
                  <li>
                    • Account suspended or terminated for Terms of Service
                    violations
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Expert Review & Revision */}
          <div className="bg-slate-800 rounded-lg p-8 border border-yellow-500/30 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
              <RefreshCw className="h-6 w-6 text-yellow-400 mr-2" />
              Expert Review &amp; Free Revision
            </h2>
            <p className="text-gray-300 mb-4">
              When you raise a concern, our music experts personally review your
              case. They listen to your song, read your original brief, and
              assess what went wrong. Based on their review, they will either:
            </p>
            <ul className="text-gray-300 space-y-2 ml-4 mb-4">
              <li>
                •{" "}
                <strong className="text-white">
                  Offer a free expert revision
                </strong>
                : the most common outcome. Our team re-creates your song
                incorporating your feedback, at no additional charge.
              </li>
              <li>
                • <strong className="text-white">Process a full refund</strong>:
                if the issue is a valid technical failure, a significant
                mismatch from your brief, or the revised song still doesn&apos;t
                meet your submitted specifications.
              </li>
            </ul>
            <p className="text-gray-300">
              To initiate a review, contact us within{" "}
              <strong className="text-white">7 days</strong> of receiving your
              song and include:
            </p>
            <ul className="text-gray-300 space-y-1 ml-4 mt-3">
              <li>• Your order number</li>
              <li>• What specifically didn&apos;t match your brief</li>
              <li>• Any guidance for the revised version (if applicable)</li>
            </ul>
          </div>

          {/* Refund Process */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              How to Request a Refund
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <Clock className="h-5 w-5 text-yellow-400 mr-2" />
                  Steps
                </h3>
                <ol className="text-gray-300 space-y-2 ml-7">
                  <li>
                    1. Email us at{" "}
                    <strong className="text-white">
                      info@melodia-songs.com
                    </strong>{" "}
                    within <strong className="text-white">7 days</strong> of the
                    issue
                  </li>
                  <li>
                    2. Include your order number and the email used at checkout
                  </li>
                  <li>
                    3. Describe the issue clearly. Attach screenshots or error
                    messages if available.
                  </li>
                  <li>
                    4. Confirm your preferred refund method (original payment
                    method or bank transfer)
                  </li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <Clock className="h-5 w-5 text-yellow-400 mr-2" />
                  Processing Timeline
                </h3>
                <ul className="text-gray-300 space-y-2 ml-7">
                  <li>• Initial response: within 24 hours</li>
                  <li>• Review and decision: 2–5 business days</li>
                  <li>
                    • Refund to original payment method: 5–7 business days (as
                    per RBI guidelines for digital payment refunds)
                  </li>
                  <li>• Bank transfer refunds: 3–5 business days</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Cancellation Policy */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Cancellation Policy
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Before Processing Begins
                </h3>
                <p className="text-gray-300">
                  You may cancel a song order within{" "}
                  <strong className="text-white">5 minutes</strong> of placing
                  it, before our AI begins processing. Contact us immediately.
                  Cancellations in this window receive a full refund.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  After Processing Begins
                </h3>
                <p className="text-gray-300">
                  Once generation is underway, cancellation is not possible due
                  to the automated nature of our service. If a technical error
                  prevents delivery, you are fully eligible for a refund.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Account Closure
                </h3>
                <p className="text-gray-300">
                  You may close your account at any time by contacting us.
                  Account closure does not automatically trigger refunds for
                  completed orders, but you may separately raise refund requests
                  for any eligible transactions.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
              <CreditCard className="h-6 w-6 text-yellow-400 mr-2" />
              Refund Methods
            </h2>

            <p className="text-gray-300 mb-4">
              Refunds are returned via the same method used at checkout:
            </p>

            <ul className="text-gray-300 space-y-2 ml-4 mb-4">
              <li>
                •{" "}
                <strong className="text-white">
                  UPI / Cards / Netbanking (Cashfree):
                </strong>{" "}
                Refunded to the original source within 5–7 business days
              </li>
              <li>
                • <strong className="text-white">Bank Transfer:</strong>{" "}
                Refunded to your bank account within 3–5 business days
              </li>
            </ul>

            <p className="text-gray-300">
              If the original payment method is no longer active, we will
              coordinate an alternative refund method with you directly.
            </p>
          </div>

          {/* Special Circumstances */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Special Circumstances
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <AlertCircle className="h-5 w-5 text-orange-400 mr-2" />
                  Service Outages
                </h3>
                <p className="text-gray-300">
                  If a widespread technical issue affects multiple customers, we
                  may proactively issue refunds or service credits without
                  requiring individual requests. We will notify affected
                  customers by email.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Billing Errors
                </h3>
                <p className="text-gray-300">
                  Any billing error on our part (duplicate charges, incorrect
                  amounts) will be corrected immediately with a full refund.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Force Majeure
                </h3>
                <p className="text-gray-300">
                  In cases of force majeure (natural disasters, widespread
                  infrastructure outages, etc.) we will work with each affected
                  customer individually to provide refunds or service credits.
                </p>
              </div>
            </div>
          </div>

          {/* Dispute Resolution */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Dispute Resolution
            </h2>

            <p className="text-gray-300 mb-4">
              If you disagree with our refund decision, please escalate through
              these steps:
            </p>

            <ol className="text-gray-300 space-y-2 ml-4 mb-4">
              <li>
                1. <strong className="text-white">Internal escalation:</strong>{" "}
                Request a review by our management team via email
              </li>
              <li>
                2. <strong className="text-white">Consumer Forum:</strong> As an
                individual customer, you may raise a complaint with the relevant
                Consumer Disputes Redressal Commission under the{" "}
                <strong className="text-white">
                  Consumer Protection Act, 2019
                </strong>
              </li>
              <li>
                3. <strong className="text-white">Payment dispute:</strong> You
                may also raise a chargeback with your bank or payment provider
                if a refund is owed and not processed within the timelines above
              </li>
            </ol>

            <p className="text-gray-300">
              We always prefer to resolve disputes directly and will respond
              promptly to any escalation.
            </p>
          </div>

          {/* Policy Updates */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Policy Updates
            </h2>
            <p className="text-gray-300">
              We may update this policy from time to time. Material changes will
              be communicated by email to registered customers. The &quot;Last
              updated&quot; date at the top of this page always reflects the
              current version.
            </p>
          </div>

          {/* Contact Information */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Contact Us for Refunds
            </h2>

            <p className="text-gray-300 mb-6">
              Reach out to our support team. We typically respond within 24
              hours on business days.
            </p>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-yellow-400" />
                <span className="text-gray-300">info@melodia-songs.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-yellow-400" />
                <span className="text-gray-300">+91 74834 64565</span>
              </div>
              <div className="text-gray-300 mt-4">
                <p className="mb-2">When writing to us, please include:</p>
                <ul className="ml-4 space-y-1">
                  <li>• Your order number</li>
                  <li>• The email address used at checkout</li>
                  <li>• A clear description of the issue</li>
                  <li>• Screenshots or error messages, if applicable</li>
                </ul>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-lg p-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Need Help with a Refund?
            </h2>
            <p className="text-xl text-slate-800 mb-8">
              Our support team is here to help. We will respond within 24 hours
              and work hard to make things right.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="bg-slate-900 text-white px-8 py-3 rounded-full font-semibold text-lg hover:bg-slate-800 transition-colors"
              >
                Contact Support
              </Link>
              <Link
                href="/terms"
                className="border-2 border-slate-900 text-slate-900 px-8 py-3 rounded-full font-semibold text-lg hover:bg-slate-900 hover:text-white transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

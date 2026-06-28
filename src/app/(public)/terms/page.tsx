import Footer from "@/components/Footer";
import Header from "@/components/Header";
import type { Metadata } from "next";
import { CheckCircle, Shield, XCircle } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions | Melodia",
  description:
    "Read Melodia's Terms and Conditions for our personalized song creation platform. Learn about user responsibilities, intellectual property rights, payment terms, and service usage policies.",
  keywords:
    "terms and conditions, melodia terms, service agreement, user agreement, terms of service, legal terms, AI music terms",
  openGraph: {
    title: "Terms & Conditions | Melodia",
    description:
      "Read our Terms and Conditions for using Melodia's personalized song creation service.",
    url: "https://www.melodia-songs.com/terms",
    siteName: "Melodia",
    images: ["/images/melodia-logo-og.jpeg"],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms & Conditions | Melodia",
    description:
      "Read our Terms and Conditions for using Melodia's personalized song creation service.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/terms",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="hidden md:block"><Header /></div>
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              Terms and Conditions
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Please read these terms carefully before using our AI-powered song
              creation platform.
            </p>
            <p className="text-sm text-gray-400 mt-4">
              Last updated: January 2024
            </p>
          </div>

          {/* Introduction */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Agreement to Terms
            </h2>
            <p className="text-gray-300 mb-4">
              These Terms and Conditions (&quot;Terms&quot;) govern your use of
              Melodia&apos;s AI-powered song creation platform
              (&quot;Service&quot;). By accessing or using our Service, you
              agree to be bound by these Terms.
            </p>
            <p className="text-gray-300">
              If you do not agree to these Terms, please do not use our Service.
            </p>
          </div>

          {/* Service Description */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Service Description
            </h2>

            <div className="space-y-4">
              <p className="text-gray-300">
                Melodia provides an AI-powered platform that creates
                personalized songs based on user input. Our Service includes:
              </p>

              <ul className="text-gray-300 space-y-2 ml-4">
                <li>
                  • AI-generated lyrics creation based on your specifications
                </li>
                <li>• AI-composed music generation</li>
                <li>• Song editing and customization tools</li>
                <li>• Download and sharing capabilities</li>
                <li>• User account management</li>
              </ul>
            </div>
          </div>

          {/* User Responsibilities */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              User Responsibilities
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                  Acceptable Use
                </h3>
                <ul className="text-gray-300 space-y-2 ml-7">
                  <li>• Provide accurate and truthful information</li>
                  <li>• Use the Service for lawful purposes only</li>
                  <li>• Respect intellectual property rights</li>
                  <li>• Maintain the security of your account</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <XCircle className="h-5 w-5 text-red-400 mr-2" />
                  Prohibited Activities
                </h3>
                <ul className="text-gray-300 space-y-2 ml-7">
                  <li>
                    • Creating songs with offensive, harmful, or illegal content
                  </li>
                  <li>• Attempting to reverse engineer our AI systems</li>
                  <li>• Sharing your account credentials with others</li>
                  <li>
                    • Using the Service to violate any laws or regulations
                  </li>
                  <li>
                    • Uploading malicious software or attempting to hack our
                    systems
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Intellectual Property */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Intellectual Property Rights
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Your Content
                </h3>
                <p className="text-gray-300 mb-4">
                  You retain ownership of the personal information and details
                  you provide to create songs. However, by using our Service,
                  you grant us a license to use this information to generate
                  your personalized songs.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Generated Songs
                </h3>
                <p className="text-gray-300 mb-4">
                  Songs generated by our AI are created for your personal use.
                  You may download, share, and use these songs for personal,
                  non-commercial purposes. Commercial use may require additional
                  licensing.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Our Technology
                </h3>
                <p className="text-gray-300">
                  All AI algorithms, software, and technology used to power our
                  Service remain our intellectual property. You may not copy,
                  modify, or distribute our technology.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Payment Terms
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Pricing
                </h3>
                <p className="text-gray-300">
                  Our Service may include both free and paid features. Pricing
                  for paid features will be clearly displayed before purchase.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Payment Processing
                </h3>
                <p className="text-gray-300">
                  Payments are processed through secure third-party payment
                  processors. We do not store your payment information on our
                  servers.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Refunds
                </h3>
                <p className="text-gray-300">
                  Refund policies are outlined in our separate Refund Policy.
                  Please review that document for specific refund terms.
                </p>
              </div>
            </div>
          </div>

          {/* Service Availability */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Service Availability
            </h2>

            <div className="space-y-4">
              <p className="text-gray-300">
                We strive to maintain high service availability, but we cannot
                guarantee uninterrupted access. The Service may be temporarily
                unavailable due to:
              </p>

              <ul className="text-gray-300 space-y-2 ml-4">
                <li>• Scheduled maintenance and updates</li>
                <li>• Technical difficulties or system failures</li>
                <li>• Third-party service interruptions</li>
                <li>• Force majeure events</li>
              </ul>
            </div>
          </div>

          {/* Privacy and Data */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
              <Shield className="h-6 w-6 text-yellow-400 mr-2" />
              Privacy and Data Protection
            </h2>

            <div className="space-y-4">
              <p className="text-gray-300">
                Your privacy is important to us. Our collection and use of your
                information is governed by our Privacy Policy, which is
                incorporated into these Terms by reference.
              </p>

              <p className="text-gray-300">
                By using our Service, you consent to the collection and use of
                your information as described in our Privacy Policy.
              </p>
            </div>
          </div>

          {/* Limitation of Liability */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Limitation of Liability
            </h2>

            <div className="space-y-4">
              <p className="text-gray-300">
                To the maximum extent permitted by law, Melodia shall not be
                liable for any indirect, incidental, special, consequential, or
                punitive damages, including but not limited to:
              </p>

              <ul className="text-gray-300 space-y-2 ml-4">
                <li>• Loss of profits, data, or business opportunities</li>
                <li>• Service interruptions or delays</li>
                <li>
                  • AI-generated content that may not meet your expectations
                </li>
                <li>• Third-party actions or content</li>
              </ul>

              <p className="text-gray-300">
                Our total liability shall not exceed the amount you paid for the
                Service in the 12 months preceding the claim.
              </p>
            </div>
          </div>

          {/* Disclaimers */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Disclaimers
            </h2>

            <div className="space-y-4">
              <p className="text-gray-300">
                The Service is provided &quot;as is&quot; and &quot;as
                available&quot; without warranties of any kind. We disclaim all
                warranties, express or implied, including:
              </p>

              <ul className="text-gray-300 space-y-2 ml-4">
                <li>
                  • Warranties of merchantability and fitness for a particular
                  purpose
                </li>
                <li>
                  • Warranties regarding the accuracy or reliability of
                  AI-generated content
                </li>
                <li>
                  • Warranties that the Service will be uninterrupted or
                  error-free
                </li>
                <li>• Warranties regarding third-party services or content</li>
              </ul>
            </div>
          </div>

          {/* Termination */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Termination
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  By You
                </h3>
                <p className="text-gray-300">
                  You may terminate your account at any time by contacting us or
                  using the account deletion feature in your account settings.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">By Us</h3>
                <p className="text-gray-300">
                  We may terminate or suspend your account immediately if you
                  violate these Terms or engage in prohibited activities.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Effect of Termination
                </h3>
                <p className="text-gray-300">
                  Upon termination, your right to use the Service ceases
                  immediately. We may delete your account and associated data,
                  though some information may be retained as required by law.
                </p>
              </div>
            </div>
          </div>

          {/* Changes to Terms */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Changes to Terms
            </h2>

            <p className="text-gray-300">
              We may modify these Terms at any time. We will notify you of
              material changes by email or through our Service. Your continued
              use of the Service after changes become effective constitutes
              acceptance of the new Terms.
            </p>
          </div>

          {/* Governing Law */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Governing Law
            </h2>

            <p className="text-gray-300">
              These Terms are governed by and construed in accordance with the
              laws of the State of California, without regard to conflict of law
              principles. Any disputes arising from these Terms or your use of
              the Service shall be resolved in the courts of California.
            </p>
          </div>

          {/* Contact Information */}
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Contact Information
            </h2>

            <p className="text-gray-300 mb-6">
              If you have any questions about these Terms, please contact us:
            </p>

            <div className="space-y-2">
              <p className="text-gray-300">Email: info@melodia-songs.com</p>
              <p className="text-gray-300">Phone: +917483464565</p>
              <p className="text-gray-300">Website: melodia-songs.com</p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Questions About Our Terms?
            </h2>
            <p className="text-xl text-yellow-100 mb-8">
              We&apos;re here to help clarify any questions you may have.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="bg-white text-yellow-600 px-8 py-3 rounded-full font-semibold text-lg hover:bg-gray-100 transition-colors"
              >
                Contact Us
              </Link>
              <Link
                href="/refund"
                className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold text-lg hover:bg-white hover:text-yellow-600 transition-colors"
              >
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

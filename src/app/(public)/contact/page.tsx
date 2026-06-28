"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, Phone, ArrowRight } from "lucide-react";
import { HeaderLogo } from "@/components/OptimizedLogo";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

// Note: Metadata should be in layout.tsx for client components
// We'll create a layout file for this

// WhatsApp Icon Component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
  </svg>
);

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setStatusMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus("success");
        setStatusMessage(data.message || "Message sent successfully!");
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          subject: "",
          message: "",
        });
      } else {
        setSubmitStatus("error");
        setStatusMessage(
          data.error || "Failed to send message. Please try again."
        );
      }
    } catch (error) {
      setSubmitStatus("error");
      setStatusMessage(
        "Network error. Please try again or contact us directly."
      );
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-secondary-cream min-h-screen relative overflow-hidden">
      {/* Wavy Background Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg
          className="absolute top-0 left-0 w-full h-full opacity-10"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id="wave-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#FFD166" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#EF476F" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#FFD166" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path
            fill="url(#wave-gradient)"
            d="M0,160L48,149.3C96,139,192,117,288,122.7C384,128,480,160,576,165.3C672,171,768,149,864,138.7C960,128,1056,128,1152,133.3C1248,139,1344,149,1392,154.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          >
            <animate
              attributeName="d"
              dur="20s"
              repeatCount="indefinite"
              values="M0,160L48,149.3C96,139,192,117,288,122.7C384,128,480,160,576,165.3C672,171,768,149,864,138.7C960,128,1056,128,1152,133.3C1248,139,1344,149,1392,154.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
              M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,117.3C960,128,1056,160,1152,165.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
              M0,192L48,186.7C96,181,192,171,288,176C384,181,480,203,576,208C672,213,768,203,864,197.3C960,192,1056,192,1152,197.3C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
              M0,160L48,149.3C96,139,192,117,288,122.7C384,128,480,160,576,165.3C672,171,768,149,864,138.7C960,128,1056,128,1152,133.3C1248,139,1344,149,1392,154.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </path>
        </svg>
      </div>

      {/* Header */}
      <header className="w-full bg-secondary-cream/80 backdrop-blur-sm flex items-center justify-between px-2 sm:px-4 md:px-8 py-1 sm:py-2 relative shadow-elegant z-10">
        <Link
          href="/"
          className="flex items-center gap-1 sm:gap-2"
          aria-label="Go to homepage"
        >
          <HeaderLogo alt="Melodia Logo" />
        </Link>
      </header>

      <main className="container mx-auto px-4 py-12 sm:py-16 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold text-text-teal mb-6">
              Get in Touch
            </h1>
            <p className="font-body text-text-teal/80 text-lg max-w-2xl mx-auto">
              We&apos;d love to hear from you! Whether you have a question about
              our service, a custom request, or just want to say hello, feel
              free to reach out.
            </p>
          </div>

          {/* Phone and WhatsApp Section */}
          <div className="mb-12">
            <div className="bg-white/60 backdrop-blur-sm border border-text-teal/10 rounded-2xl p-8 hover:shadow-elegant transition-shadow duration-300 max-w-2xl mx-auto text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 rounded-full bg-primary-yellow/10 mr-4">
                  <Phone className="h-6 w-6 text-primary-yellow" />
                </div>
                <h3 className="text-2xl font-heading font-bold text-text-teal">
                  Call or WhatsApp
                </h3>
              </div>
              <p className="font-body text-text-teal/80 mb-4">
                Feel free to give us a call or message us on WhatsApp for a
                quicker response.
              </p>
              <div className="space-y-2">
                <a
                  href="tel:+917483464565"
                  className="font-body font-semibold text-text-teal hover:underline block text-lg"
                >
                  +917483464565
                </a>
                <a
                  href="tel:+919008638618"
                  className="font-body font-semibold text-text-teal hover:underline block text-lg"
                >
                  +91 90086 38618
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            {/* Contact Form */}
            <div
              id="contact-form"
              className="bg-gradient-to-br from-white to-secondary-cream rounded-3xl shadow-2xl p-8 sm:p-10 border border-primary-yellow/20"
            >
              <h2 className="text-3xl font-heading font-bold text-text-teal mb-8 text-center">
                Send a Message
              </h2>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-text-teal mb-2"
                    >
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full h-12 px-4 bg-white border border-text-teal/20 rounded-lg placeholder-text-teal/50 focus:ring-2 focus:ring-primary-yellow focus:border-transparent font-body"
                      placeholder="Your first name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-text-teal mb-2"
                    >
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="w-full h-12 px-4 bg-white border border-text-teal/20 rounded-lg placeholder-text-teal/50 focus:ring-2 focus:ring-primary-yellow focus:border-transparent font-body"
                      placeholder="Your last name"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-text-teal mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full h-12 px-4 bg-white border border-text-teal/20 rounded-lg placeholder-text-teal/50 focus:ring-2 focus:ring-primary-yellow focus:border-transparent font-body"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-text-teal mb-2"
                  >
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full h-12 px-4 bg-white border border-text-teal/20 rounded-lg placeholder-text-teal/50 focus:ring-2 focus:ring-primary-yellow focus:border-transparent font-body"
                    placeholder="What's this about?"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-text-teal mb-2"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 bg-white border border-text-teal/20 rounded-lg placeholder-text-teal/50 focus:ring-2 focus:ring-primary-yellow focus:border-transparent font-body"
                    placeholder="Tell us how we can help you..."
                  ></textarea>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="lg"
                  className="w-full h-14 bg-gradient-to-r from-primary-yellow to-yellow-400 text-text-teal font-heading font-bold text-lg rounded-full shadow-elegant hover:shadow-glow hover:from-yellow-400 hover:to-yellow-500 transition-all duration-300 transform hover:scale-105"
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </form>
              {submitStatus !== "idle" && (
                <div className="mt-4 text-center">
                  {submitStatus === "success" && (
                    <p className="text-green-600">{statusMessage}</p>
                  )}
                  {submitStatus === "error" && (
                    <p className="text-red-600">{statusMessage}</p>
                  )}
                </div>
              )}
            </div>

            {/* Contact Details */}
            <div className="space-y-8">
              <div className="bg-white/60 backdrop-blur-sm border border-text-teal/10 rounded-2xl p-8 hover:shadow-elegant transition-shadow duration-300">
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-full bg-accent-coral/10 mr-4">
                    <Mail className="h-6 w-6 text-accent-coral" />
                  </div>
                  <h3 className="text-2xl font-heading font-bold text-text-teal">
                    Email Us
                  </h3>
                </div>
                <p className="font-body text-text-teal/80 mb-4">
                  For any inquiries, please email us. We&apos;ll get back to you
                  as soon as possible.
                </p>
                <a
                  href="mailto:info@melodia-songs.com"
                  className="font-body font-semibold text-accent-coral hover:underline"
                >
                  info@melodia-songs.com
                </a>
              </div>

              <div className="bg-white/60 backdrop-blur-sm border border-text-teal/10 rounded-2xl p-8 hover:shadow-elegant transition-shadow duration-300">
                <h3 className="text-2xl font-heading font-bold text-text-teal mb-4 text-center">
                  Follow Us
                </h3>
                <div className="flex justify-center space-x-6">
                  <a
                    href="https://www.instagram.com/melodia.songs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-teal/70 hover:text-accent-coral transition-colors"
                    aria-label="Instagram"
                  >
                    <svg
                      className="h-8 w-8"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                  <a
                    href="https://x.com/melodia_songs?t=-JQpro8iywfJoPTWgsFWDA&s=09"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-teal/70 hover:text-primary-yellow transition-colors"
                    aria-label="X (formerly Twitter)"
                  >
                    <svg
                      className="h-8 w-8"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L8.084 4.126H6.117z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

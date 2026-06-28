import { Metadata } from "next";
import Link from "next/link";
import { Globe, Music } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LANGUAGE_PAGES } from "@/lib/seo/language-pages";

export const metadata: Metadata = {
  title: "Personalized Songs in 20+ Indian Languages | Melodia India",
  description:
    "We create heartfelt, personalized songs for your loved ones in Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi, Urdu, Odia, Assamese & more. Making every occasion unforgettable.",
  keywords:
    "personalized songs Indian languages, custom songs Hindi, songs Tamil, songs Telugu, songs Kannada, songs Bengali, songs Marathi, songs Punjabi, Melodia languages",
  openGraph: {
    title: "Personalized Songs in 20+ Indian Languages | Melodia",
    description:
      "Create custom songs in Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi & more.",
    url: "https://www.melodia-songs.com/languages",
    images: [{ url: "/images/melodia-logo-og.jpeg", width: 792, height: 446, alt: "Melodia Languages" }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Personalized Songs in 20+ Indian Languages | Melodia",
    description:
      "Create custom songs in Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi & more.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/languages",
  },
};

export default function LanguagesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5 flex flex-col">
      <div className="hidden md:block"><Header /></div>

      <main className="flex-1 py-12 sm:py-16 md:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-teal text-center font-heading mb-4">
            <span className="inline-flex items-center gap-2">
              <Globe className="w-8 h-8 text-accent-coral" />
              Songs in Every Language
              <Globe className="w-8 h-8 text-accent-coral" />
            </span>
          </h1>
          <p className="text-text-teal/80 text-center text-base sm:text-lg max-w-2xl mx-auto mb-4">
            Melodia creates personalized songs in 20+ Indian languages. Choose
            your language and create a custom song for any occasion.
          </p>
          <p className="text-text-teal/60 text-center text-sm max-w-xl mx-auto mb-12">
            India&apos;s leading AI-powered personalized song creation platform — songs
            from INR 199 with instant delivery.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {LANGUAGE_PAGES.map((lang) => (
              <Link
                key={lang.slug}
                href={`/languages/${lang.slug}`}
                className="group block"
              >
                <div className="bg-white/70 border border-primary-yellow/20 rounded-2xl p-6 hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-yellow to-accent-coral rounded-full flex items-center justify-center flex-shrink-0">
                      <Music className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text-teal group-hover:text-accent-coral transition-colors">
                        {lang.name}
                      </h3>
                      <p className="text-sm text-text-teal/60">{lang.nativeName}</p>
                    </div>
                  </div>
                  <p className="text-text-teal/70 text-sm line-clamp-3">
                    {lang.introContent.slice(0, 150)}...
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-text-teal/60 text-sm">
              Don&apos;t see your language? Melodia also supports Sindhi, Kashmiri,
              Konkani, Maithili, Dogri, Sanskrit, Nepali, Manipuri, Bodo, English,
              Spanish, and French.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

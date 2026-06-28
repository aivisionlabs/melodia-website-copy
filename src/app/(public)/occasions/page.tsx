import { Metadata } from "next";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Heartfelt, Personalized Songs for Every Occasion | Melodia India",
  description:
    "Create personalized songs for weddings, birthdays, anniversaries, Sangeet, Haldi & 22+ occasions. Melodia is India's AI-powered custom song creation platform in 20+ languages.",
  keywords:
    "personalized songs India, custom music occasions, wedding songs India, birthday songs Hindi, anniversary songs, corporate event songs, farewell songs, romantic songs, Sangeet songs, Haldi songs",
  alternates: {
    canonical: "/occasions",
  },
  openGraph: {
    title: "Heartfelt, Personalized Songs for Every Occasion | Melodia India",
    description:
      "Melodia creates personalized songs for weddings, birthdays, anniversaries & every occasion in India. 20+ languages, songs from INR 199.",
    url: "https://www.melodia-songs.com/occasions",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "Melodia - Personalized Songs for Every Occasion in India",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Heartfelt, Personalized Songs for Every Occasion | Melodia India",
    description:
      "Create personalized songs for weddings, birthdays, anniversaries & every occasion in India. 20+ languages, songs from INR 199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
};

const occasions = [
  {
    name: "Father's Day",
    href: "/occasions/fathers-day",
    description:
      "Celebrate Father's Day with a custom song that expresses your love and appreciation for your father.",
    imageSrc: "/images/occasions/fathers-day/fathers-day-hero.png",
  },
  {
    name: "Kid's Birthday",
    href: "/occasions/birthday",
    description:
      "Surprise them with a heartfelt, personalized birthday anthem.",
    imageSrc: "/images/occasions/kid-birthday.png",
  },
  {
    name: "Adult Birthday",
    href: "/occasions/adult-birthday",
    description:
      "Surprise them with a heartfelt, personalized birthday anthem.",
    imageSrc: "/images/occasions/adult-birthday.png",
  },
  {
    name: "Anniversary",
    href: "/occasions/anniversary",
    description:
      "Relive your favorite moments with a song that tells your unique love story.",
    imageSrc: "/images/occasions/anniversary.png",
  },
  {
    name: "Romantic",
    href: "/occasions/romantic",
    description:
      "Express your deepest feelings with a custom song for proposals or romantic moments.",
    imageSrc: "/images/occasions/romantic.png",
  },
  {
    name: "Sangeet",
    href: "/occasions/sangeet",
    description: "Create the perfect song for your Sangeet ceremony.",
    imageSrc: "/images/occasions/sangeet.png",
  },
  {
    name: "Haldi",
    href: "/occasions/haldi",
    description: "Create the perfect song for your Haldi ceremony.",
    imageSrc: "/images/occasions/haldi.png",
  },
  {
    name: "Ring Ceremony",
    href: "/occasions/ring-ceremony",
    description: "Create the perfect song for your Ring Ceremony.",
    imageSrc: "/images/occasions/ring-ceremony.png",
  },
  {
    name: "Mehndi",
    href: "/occasions/mehndi",
    description: "Create the perfect song for your Mehndi ceremony.",
    imageSrc: "/images/occasions/mehndi.png",
  },
  {
    name: "Weddings",
    href: "/occasions/weddings",
    description:
      "Create the perfect song for your Mahila Sangeet, Haldi, or ring ceremony.",
    imageSrc: "/images/occasions/wedding.png",
  },
  {
    name: "Lullaby",
    href: "/occasions/lullaby",
    description:
      "Create soothing personalized lullabies that help babies and children drift off to sleep.",
    imageSrc: "/images/occasions/lullaby.png",
  },
  {
    name: "Kids",
    href: "/occasions/kids",
    description:
      "Create magical songs for children that spark their imagination and celebrate their achievements.",
    imageSrc: "/images/occasions/kids.png",
  },
  {
    name: "Party",
    href: "/occasions/party",
    description:
      "Get the party started with custom songs that capture the energy of your celebration.",
    imageSrc: "/images/occasions/party.png",
  },
  {
    name: "Friendship",
    href: "/occasions/friendship",
    description:
      "Celebrate your friendship with a custom song that captures your shared memories and bond.",
    imageSrc: "/images/occasions/friendship.png",
  },
  {
    name: "Apology",
    href: "/occasions/apology",
    description:
      "Express your sincere apologies through music with a heartfelt song that conveys your regret.",
    imageSrc: "/images/occasions/apology.png",
  },
  {
    name: "Corporate Events",
    href: "/occasions/corporate-events",
    description:
      "Elevate your corporate events with custom songs that celebrate achievements and team spirit.",
    imageSrc: "/images/occasions/corporate.png",
  },
  {
    name: "Farewell",
    href: "/occasions/farewell",
    description:
      "Say goodbye in style with a custom farewell song that honors memories and celebrates the journey.",
    imageSrc: "/images/occasions/farewell.png",
  },
  {
    name: "Siblings",
    href: "/occasions/siblings",
    description:
      "Celebrate the special bond between siblings with songs that capture shared childhood adventures.",
    imageSrc: "/images/occasions/siblings.png",
  },
  {
    name: "Parents",
    href: "/occasions/parents",
    description:
      "Honor your parents with custom songs that celebrate their love, sacrifice, and guidance.",
    imageSrc: "/images/occasions/parents.png",
  },
  {
    name: "Congratulations",
    href: "/occasions/congratulations",
    description:
      "Celebrate achievements and milestones with custom songs that honor success and inspire greatness.",
    imageSrc: "/images/occasions/congratulations.png",
  },
  {
    name: "Thank You",
    href: "/occasions/thank-you",
    description:
      "Express heartfelt gratitude with custom songs that convey appreciation and recognition.",
    imageSrc: "/images/occasions/thank-you.png",
  },
  {
    name: "Motivational",
    href: "/occasions/motivational",
    description:
      "Boost motivation and inspire greatness with custom songs that energize and encourage success.",
    imageSrc: "/images/occasions/motivational.png",
  },
  {
    name: "Devotional/Spiritual",
    href: "/occasions/devotional-spiritual",
    description:
      "Create meaningful devotional songs that connect with faith, spirituality, and divine love.",
    imageSrc: "/images/occasions/devotional.png",
  },
  {
    name: "Festive/Holiday",
    href: "/occasions/festive-holiday",
    description:
      "Celebrate holidays and festivals with custom songs that capture the joy and spirit of special occasions.",
    imageSrc: "/images/occasions/festive.png",
  },
  {
    name: "Mother's Day",
    href: "/occasions/mothers-day",
    description:
      "Celebrate Mother's Day with a custom song that expresses your love and appreciation for your mother.",
    imageSrc: "/images/occasions/mothers-day/mothers-day-desktop.png",
  },
];

export default function AllOccasionsPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "All Occasions for Personalized Songs",
    description:
      "Explore all occasions for a custom song. From weddings and birthdays to anniversaries and corporate events, create a unique musical gift for any celebration.",
    url: "https://melodia-songs.com/occasions",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: [
        {
          "@type": "Service",
          name: "Wedding Songs",
          url: "https://melodia-songs.com/occasions/weddings",
        },
        {
          "@type": "Service",
          name: "Birthday Songs",
          url: "https://melodia-songs.com/occasions/birthday",
        },
        {
          "@type": "Service",
          name: "Anniversary Songs",
          url: "https://melodia-songs.com/occasions/anniversary",
        },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="flex-1 py-8 sm:py-12 md:py-16 px-4">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-text-teal/60 hover:text-text-teal text-sm font-medium mb-4"
          aria-label="Back to home"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-text-teal text-center font-heading mb-3 sm:mb-4 whitespace-nowrap">
            A Song for Every Occasion
          </h1>
          <p className="text-text-teal/80 text-center text-sm sm:text-base max-w-xl mx-auto mb-8 sm:mb-12">
            Personalized songs for every special moment. Choose your occasion
            and let us craft a unique song that&apos;s perfectly yours.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {occasions.map((occasion) => (
              <Link
                href={`/create?occasion=${encodeURIComponent(occasion.name)}`}
                key={occasion.name}
                className="block group"
              >
                <div className="relative h-44 sm:h-48 rounded-xl shadow-lg overflow-hidden cursor-pointer transform transition-transform duration-300 group-hover:scale-[1.03]">
                  {/* Background image (optional per card) */}
                  {occasion.imageSrc ? (
                    <Image
                      src={occasion.imageSrc}
                      alt={`${occasion.name} background`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                      priority={occasion.name === "Birthday"}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-text-teal/90 via-text-teal/70 to-accent-coral/60" />
                  )}

                  {/* Overlay for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />

                  {/* Subtle border/glow on hover */}
                  <div className="absolute inset-0 ring-1 ring-white/15 group-hover:ring-white/35 transition-[ring-color] duration-300" />

                  {/* Content */}
                  <div className="relative h-full p-6 flex flex-col justify-end text-left">
                    <h3 className="text-xl font-bold text-white font-heading mb-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
                      {occasion.name}
                    </h3>
                    <p className="text-white/90 text-sm leading-snug drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] line-clamp-3">
                      {occasion.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { PublicSong } from "@/types";
import { PACKAGES } from "@/app/(app)/create/_components/create-page-constants";

type BreadcrumbItem = {
  name: string;
  url: string;
};

type ItemListItem = {
  name: string;
  url: string;
  imageUrl?: string | null;
};

type FAQItem = {
  question: string;
  answer: string;
};

type ArticleAuthor = {
  name: string;
  /** Author page URL — lets Google resolve a stable Person entity. */
  url?: string;
  jobTitle?: string;
  /** Public profiles establishing authoritativeness. */
  sameAs?: string[];
  imageUrl?: string;
};

type ArticleProps = {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  /** @deprecated prefer `author` for a full E-E-A-T Person entity */
  authorName?: string;
  /** Structured Person author (preferred). */
  author?: ArticleAuthor;
  imageUrl?: string;
};

type ProfilePageProps = {
  name: string;
  url: string;
  jobTitle?: string;
  description?: string;
  imageUrl?: string;
  sameAs?: string[];
};

interface StructuredDataProps {
  song?: PublicSong;
  breadcrumbItems?: BreadcrumbItem[];
  itemListItems?: ItemListItem[];
  faqItems?: FAQItem[];
  article?: ArticleProps;
  profilePage?: ProfilePageProps;
  type:
    | "website"
    | "song"
    | "organization"
    | "breadcrumb"
    | "itemList"
    | "faq"
    | "aiPlatform"
    | "aggregateRating"
    | "localBusiness"
    | "article"
    | "profilePage"
    | "product"
    | "siteNavigation";
}

export function StructuredData({
  song,
  type,
  breadcrumbItems,
  itemListItems,
  faqItems,
  article,
  profilePage,
}: StructuredDataProps) {
  const baseUrl = "https://www.melodia-songs.com";

  const toAbsoluteUrl = (url: string) => {
    if (!url) return baseUrl;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return `${baseUrl}${url}`;
    return `${baseUrl}/${url}`;
  };

  const getStructuredData = () => {
    switch (type) {
      case "website":
        return {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": `${baseUrl}/#website`,
          name: "Melodia",
          alternateName: "Melodia Songs",
          description: "Create Personalized Songs for loved ones",
          url: baseUrl,
          inLanguage: "en-IN",
          publisher: {
            "@type": "Organization",
            "@id": `${baseUrl}/#organization`,
            name: "Melodia",
          },
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${baseUrl}/library?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        };

      case "siteNavigation":
        return [
          {
            "@context": "https://schema.org",
            "@type": "SiteLinksSearchBox",
            url: baseUrl,
            potentialAction: [
              {
                "@type": "SearchAction",
                target: `${baseUrl}/library?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Melodia Navigation",
            itemListElement: [
              {
                "@type": "SiteNavigationElement",
                position: 1,
                name: "Create a Song",
                description: "Create a personalized song for any occasion",
                url: `${baseUrl}/create`,
              },
              {
                "@type": "SiteNavigationElement",
                position: 2,
                name: "Song Library",
                description: "Browse personalized songs created on Melodia",
                url: `${baseUrl}/library`,
              },
              {
                "@type": "SiteNavigationElement",
                position: 3,
                name: "Pricing",
                description: "Affordable plans starting at ₹199",
                url: `${baseUrl}/pricing`,
              },
              {
                "@type": "SiteNavigationElement",
                position: 4,
                name: "Occasions",
                description: "Songs for weddings, birthdays, anniversaries and more",
                url: `${baseUrl}/occasions`,
              },
              {
                "@type": "SiteNavigationElement",
                position: 5,
                name: "How It Works",
                description: "See how Melodia creates your personalized song",
                url: `${baseUrl}/how-it-works`,
              },
              {
                "@type": "SiteNavigationElement",
                position: 6,
                name: "Blog",
                description: "Tips and inspiration for personalized songs",
                url: `${baseUrl}/blog`,
              },
            ],
          },
        ];

      case "aiPlatform":
        return {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Melodia AI Song Engine",
          description:
            "A Lyric-First AI platform that creates personalized lyrics from your stories and generates high-quality custom songs for any occasion.",
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Web",
          featureList: [
            "AI-Powered Personalized Lyric Generation",
            "Vibe-First Emotional Data Capture",
            "5 minutes Custom Song Creation",
            "Occasion-Specific Song Tailoring",
          ],
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            bestRating: "5",
            worstRating: "1",
            ratingCount: "500",
            reviewCount: "320",
          },
          offers: {
            "@type": "AggregateOffer",
            lowPrice: "199",
            highPrice: "1499",
            priceCurrency: "INR",
            offerCount: "3",
            availability: "https://schema.org/InStock",
          },
        };

      case "song":
        if (!song) return null;
        const mood = Array.isArray(song.mood)
          ? song.mood?.join(", ")
          : song.mood;

        const musicStyle = song.music_style;
        const occasion = song.occasion;
        const requestLanguages = song.request_languages?.split(",").join(", ");
        const title = song.title;
        const duration = `PT${Math.floor(parseFloat(song.duration || "0") / 60)}M${Math.floor(parseFloat(song.duration || "0") % 60)}S`;
        const description = `A custom ${mood} song created for ${occasion} in ${requestLanguages}. Listen to "${title}" on Melodia, India's best personalized song creation platform.`;

        const tagStr =
          song.tags?.length ? song.tags.join(", ") : "";
        const catStr =
          song.categories?.length ? song.categories.join(", ") : "";

        const songKeywords = [
          song.occasion,
          Array.isArray(song.mood) ? song.mood.join(", ") : song.mood,
          song.request_languages,
          tagStr,
          catStr,
          "personalized song",
          "custom music",
        ]
          .filter(Boolean)
          .join(", ");

        return {
          "@context": "https://schema.org",
          "@type": "MusicRecording",
          name: song.title,
          url: `${baseUrl}/song/${song.slug}`,
          genre: musicStyle,
          description,
          keywords: songKeywords,
          duration,
          composer: {
            "@type": "SoftwareApplication",
            name: "Melodia Lyric-First Song Engine",
          },
          lyrics: {
            "@type": "CreativeWork",
            text: song.lyrics, // This prioritizes your "Lyrics First" identity
          },
          creator: {
            "@type": "Organization",
            name: "Melodia",
            url: baseUrl,
          },
          abstract: `Personalized lyrics based on user occasion: ${occasion} and vibe: ${mood}`,
          audio: {
            "@type": "AudioObject",
            contentUrl: song.song_url,
            encodingFormat: "audio/mpeg",
            description: `Audio file for ${song.title}`,
          },
        };

      case "organization":
        return {
          "@context": "https://schema.org",
          "@type": "Organization",
          "@id": `${baseUrl}/#organization`,
          name: "Melodia",
          alternateName: "Melodia Songs",
          description:
            "We create heartfelt, personalized songs for your loved ones — in Hindi, Tamil, Telugu, and 20+ Indian languages. Musically capturing emotions and making every occasion unforgettable.",
          url: baseUrl,
          logo: `${baseUrl}/images/melodia-logo-og.jpeg`,
          foundingDate: "2024",
          founder: [
            { "@type": "Person", name: "Saurabh Pareekh" },
            { "@type": "Person", name: "Minkesh Jain" },
          ],
          areaServed: {
            "@type": "Country",
            name: "India",
          },
          contactPoint: {
            "@type": "ContactPoint",
            telephone: "+917483464565",
            email: "info@melodia-songs.com",
            contactType: "customer service",
            availableLanguage: ["English", "Hindi"],
          },
          sameAs: [
            "https://twitter.com/melodia",
            "https://www.instagram.com/melodia.songs",
            "https://x.com/melodia_songs",
            "https://www.facebook.com/people/Melodiasongs/61583621763902",
            "https://www.youtube.com/@melodia_songs_com",
          ],
        };

      case "breadcrumb": {
        if (!breadcrumbItems || breadcrumbItems.length === 0) return null;

        return {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbItems.map((item, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            name: item.name,
            item: toAbsoluteUrl(item.url),
          })),
        };
      }

      case "itemList": {
        if (!itemListItems || itemListItems.length === 0) return null;

        return {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: itemListItems.map((item, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            url: toAbsoluteUrl(item.url),
            ...(item.name ? { name: item.name } : {}),
            ...(item.imageUrl
              ? {
                  image: toAbsoluteUrl(item.imageUrl),
                }
              : {}),
          })),
        };
      }

      case "faq": {
        if (!faqItems || faqItems.length === 0) return null;

        return {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        };
      }

      case "aggregateRating":
        return {
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Melodia Personalized Songs",
          description:
            "AI-powered personalized song creation platform in India. Create custom songs in 20+ languages for weddings, birthdays, anniversaries, and every occasion.",
          brand: {
            "@type": "Brand",
            name: "Melodia",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            bestRating: "5",
            worstRating: "1",
            ratingCount: "500",
            reviewCount: "320",
          },
          offers: {
            "@type": "AggregateOffer",
            lowPrice: "199",
            highPrice: "1499",
            priceCurrency: "INR",
            offerCount: "3",
            availability: "https://schema.org/InStock",
          },
          review: [
            {
              "@type": "Review",
              reviewRating: {
                "@type": "Rating",
                ratingValue: "5",
              },
              author: { "@type": "Person", name: "Ridha" },
              reviewBody:
                "The song was so personal and beautiful. It perfectly captured our story. Best gift I ever gave!",
            },
            {
              "@type": "Review",
              reviewRating: {
                "@type": "Rating",
                ratingValue: "5",
              },
              author: { "@type": "Person", name: "Rohan" },
              reviewBody:
                "Created a wedding Sangeet song in Hindi-English mix. Everyone loved it! Melodia made our celebration unforgettable.",
            },
            {
              "@type": "Review",
              reviewRating: {
                "@type": "Rating",
                ratingValue: "5",
              },
              author: { "@type": "Person", name: "Shruti" },
              reviewBody:
                "Made a birthday song for my mom in Marathi. She was in tears. The lyrics were so touching and personal.",
            },
          ],
        };

      case "product": {
        // Driven by the live PACKAGES list so the markup never drifts from the
        // prices shown on the pricing page (a mismatch makes Google ignore the
        // Offer / flag the rich result).
        const prices = PACKAGES.map((p) => p.price);
        const priceValidUntil = `${new Date().getFullYear() + 1}-12-31`;

        return {
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Melodia Personalized Songs",
          description:
            "Custom, AI-powered personalized songs created from your story — in Hindi, Tamil, Telugu, and 20+ Indian languages, for weddings, birthdays, anniversaries, and every occasion.",
          brand: {
            "@type": "Brand",
            name: "Melodia",
          },
          image: `${baseUrl}/images/melodia-logo-og.jpeg`,
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            bestRating: "5",
            worstRating: "1",
            ratingCount: "500",
            reviewCount: "320",
          },
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "INR",
            lowPrice: String(Math.min(...prices)),
            highPrice: String(Math.max(...prices)),
            offerCount: String(PACKAGES.length),
            availability: "https://schema.org/InStock",
            offers: PACKAGES.map((pkg) => ({
              "@type": "Offer",
              name: pkg.name,
              description: pkg.tagline,
              price: String(pkg.price),
              priceCurrency: "INR",
              priceValidUntil,
              availability: "https://schema.org/InStock",
              url: `${baseUrl}/pricing`,
              seller: {
                "@type": "Organization",
                name: "Melodia",
              },
            })),
          },
          review: [
            {
              "@type": "Review",
              reviewRating: { "@type": "Rating", ratingValue: "5" },
              author: { "@type": "Person", name: "Ridha" },
              reviewBody:
                "The song was so personal and beautiful. It perfectly captured our story. Best gift I ever gave!",
            },
            {
              "@type": "Review",
              reviewRating: { "@type": "Rating", ratingValue: "5" },
              author: { "@type": "Person", name: "Rohan" },
              reviewBody:
                "Created a wedding Sangeet song in Hindi-English mix. Everyone loved it! Melodia made our celebration unforgettable.",
            },
            {
              "@type": "Review",
              reviewRating: { "@type": "Rating", ratingValue: "5" },
              author: { "@type": "Person", name: "Shruti" },
              reviewBody:
                "Made a birthday song for my mom in Marathi. She was in tears. The lyrics were so touching and personal.",
            },
          ],
        };
      }

      case "profilePage": {
        if (!profilePage) return null;
        return {
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: {
            "@type": "Person",
            name: profilePage.name,
            url: toAbsoluteUrl(profilePage.url),
            ...(profilePage.jobTitle ? { jobTitle: profilePage.jobTitle } : {}),
            ...(profilePage.description ? { description: profilePage.description } : {}),
            ...(profilePage.imageUrl
              ? { image: toAbsoluteUrl(profilePage.imageUrl) }
              : {}),
            ...(profilePage.sameAs?.length ? { sameAs: profilePage.sameAs } : {}),
            worksFor: {
              "@type": "Organization",
              "@id": `${baseUrl}/#organization`,
              name: "Melodia",
              url: baseUrl,
            },
          },
        };
      }

      case "localBusiness":
        return {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "@id": `${baseUrl}/#localbusiness`,
          name: "Melodia",
          description:
            "We create heartfelt, personalized songs for your loved ones — in Hindi, Tamil, Telugu, and 20+ Indian languages. Musically capturing emotions and making every occasion unforgettable.",
          url: baseUrl,
          logo: `${baseUrl}/images/melodia-logo-og.jpeg`,
          image: `${baseUrl}/images/melodia-logo-og.jpeg`,
          telephone: "+917483464565",
          email: "info@melodia-songs.com",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Electronic City Phase 2",
            addressLocality: "Bangalore",
            postalCode: "560100",
            addressCountry: "IN",
          },
          geo: {
            "@type": "GeoCoordinates",
            latitude: "20.5937",
            longitude: "78.9629",
          },
          areaServed: {
            "@type": "Country",
            name: "India",
          },
          serviceArea: {
            "@type": "Country",
            name: "India",
          },
          priceRange: "INR 199 - INR 1499",
          foundingDate: "2024",
          founder: [
            { "@type": "Person", name: "Saurabh Pareekh" },
            { "@type": "Person", name: "Minkesh Jain" },
          ],
          sameAs: [
            "https://www.instagram.com/melodia.songs",
            "https://x.com/melodia_songs",
            "https://www.facebook.com/people/Melodiasongs/61583621763902",
            "https://www.youtube.com/@melodia_songs_com",
          ],
          openingHoursSpecification: {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ],
            opens: "00:00",
            closes: "23:59",
          },
        };

      case "article": {
        if (!article) return null;

        // Prefer a full Person entity (E-E-A-T). Fall back to a bare name, and
        // finally to the Organization, preserving prior behaviour.
        const articleAuthor = article.author
          ? {
              "@type": "Person",
              name: article.author.name,
              ...(article.author.url ? { url: toAbsoluteUrl(article.author.url) } : {}),
              ...(article.author.jobTitle ? { jobTitle: article.author.jobTitle } : {}),
              ...(article.author.sameAs?.length ? { sameAs: article.author.sameAs } : {}),
              ...(article.author.imageUrl
                ? { image: toAbsoluteUrl(article.author.imageUrl) }
                : {}),
            }
          : {
              "@type": "Organization",
              name: article.authorName || "Melodia",
              url: baseUrl,
            };

        return {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.headline,
          description: article.description,
          url: toAbsoluteUrl(article.url),
          datePublished: article.datePublished,
          dateModified: article.dateModified || article.datePublished,
          author: articleAuthor,
          publisher: {
            "@type": "Organization",
            name: "Melodia",
            url: baseUrl,
            logo: {
              "@type": "ImageObject",
              url: `${baseUrl}/images/melodia-logo-og.jpeg`,
            },
          },
          image: article.imageUrl
            ? toAbsoluteUrl(article.imageUrl)
            : `${baseUrl}/images/melodia-logo-og.jpeg`,
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": toAbsoluteUrl(article.url),
          },
        };
      }

      default:
        return null;
    }
  };

  const data = getStructuredData();
  if (!data) return null;

  if (Array.isArray(data)) {
    return (
      <>
        {data.map((item, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
          />
        ))}
      </>
    );
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

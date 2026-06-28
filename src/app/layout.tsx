import { StructuredData } from "@/components/StructuredData";
import BottomTabBar from "@/components/BottomTabBar";
import WhatsAppCTA from "@/components/WhatsAppCTA";
import type { Metadata } from "next";
import Script from "next/script";
import { GoogleTagManager, GoogleAnalytics } from "@next/third-parties/google";
import { Montserrat, Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title:
    "Melodia — Heartfelt, Personalized Songs for Your Loved Ones | 20+ Indian Languages",
  description:
    "We create heartfelt, personalized songs for your loved ones — in Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Punjabi & 50+ Indian languages. Making every occasion unforgettable. AI-powered lyrics and studio-quality music from ₹199.",
  keywords:
    "personalized songs, custom music, wedding songs, birthday songs, anniversary songs, romantic songs, friendship songs, party songs, kids songs, apology songs, corporate event songs, farewell songs, lullaby songs, sibling songs, congratulations songs, thank you songs, motivational songs, devotional songs, holiday songs, parent songs, Indian wedding songs, Indian shaadi songs, shaadi music, Mahila Sangeet songs, Haldi ceremony music, Mehendi ceremony songs, Sangeet songs, wedding music, shaadi songs, engagement songs, Roka ceremony songs, Tilak ceremony music, Baraat songs, Jaimala songs, Kanyadaan music, Phere ceremony songs, Sindoor ceremony music, Mangalsutra songs, Vidaai songs, reception songs, couple love songs, personalized wedding gifts, personalized shaadi gifts, custom song gifts, wedding entertainment, shaadi entertainment, Indian wedding DJ, wedding playlist, shaadi playlist, bridal songs, groom songs, family songs, Bollywood wedding songs, Punjabi shaadi songs, Indian wedding theme songs, Bollywood theme shaadi songs, royal wedding songs, Sufi wedding songs, Rajasthani shaadi songs, Melodia",
  applicationName: "Melodia",
  authors: [{ name: "Melodia" }],
  creator: "Melodia",
  publisher: "Melodia",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://www.melodia-songs.com"),
  manifest: "/site.webmanifest",
  icons: {
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    title: "Melodia",
  },
  alternates: {
    canonical: "/",
    languages: {
      hi: "/languages/hindi",
      ta: "/languages/tamil",
      te: "/languages/telugu",
      kn: "/languages/kannada",
      ml: "/languages/malayalam",
      bn: "/languages/bengali",
      mr: "/languages/marathi",
      gu: "/languages/gujarati",
      pa: "/languages/punjabi",
      ur: "/languages/urdu",
      or: "/languages/odia",
      as: "/languages/assamese",
    },
  },
  other: {
    "msapplication-TileColor": "#FFD166",
  },
  openGraph: {
    title: "Melodia — Heartfelt, AI-Personalized Songs in 50+ Indian Languages",
    description:
      "We create heartfelt, personalized songs for your loved ones — in Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Punjabi & 50+ Indian languages. Making every occasion unforgettable. From ₹199.",
    url: "https://www.melodia-songs.com",
    siteName: "Melodia",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "Melodia — Heartfelt, AI-Personalized Songs in 50+ Indian Languages",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Melodia — Heartfelt, AI-Personalized Songs in 50+ Indian Languages",
    description:
      "We create heartfelt, personalized songs for your loved ones — in Hindi, Tamil, Telugu, Kannada, Malayalam & 50+ Indian languages. Making every occasion unforgettable. From ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
    creator: "@melodia_songs",
    site: "@melodia_songs",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <html lang="en" className="scroll-smooth">
      {gtmId && <GoogleTagManager gtmId={gtmId} />}
      {gaId && <GoogleAnalytics gaId={gaId} />}
      <head>
        {/* Preload LCP image (hero logo) for faster first paint */}
        <link
          rel="preload"
          href="/images/melodia-logo-transparent.png"
          as="image"
        />
        {/* LLM discoverability — points AI assistants to structured content */}
        <link
          rel="author"
          href="https://www.melodia-songs.com/llms.txt"
          type="text/plain"
        />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        {metaPixelId && (
          <>
            <link rel="dns-prefetch" href="https://connect.facebook.net" />
            <link rel="preconnect" href="https://connect.facebook.net" />
          </>
        )}
      </head>
      <body
        className={`${montserrat.variable} ${poppins.variable} font-body antialiased`}
      >
        {/* Meta Pixel - placed in body for App Router compatibility */}
        {metaPixelId && (
          <>
            <Script id="meta-pixel-init" strategy="lazyOnload">
              {`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${metaPixelId}');
                fbq('track', 'PageView');
              `}
            </Script>
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}
        <StructuredData type="website" />
        <StructuredData type="organization" />
        <StructuredData type="siteNavigation" />
        {/* Bottom padding so content is never hidden behind the sticky tab bar */}
        <div className="pb-16 md:pb-0">{children}</div>
        {/* Global sticky bottom navigation — always visible on mobile across ALL pages */}
        <BottomTabBar />
        {/* Small floating WhatsApp icon — above tab bar on mobile, bottom-right on desktop */}
        <WhatsAppCTA compact />
      </body>
    </html>
  );
}

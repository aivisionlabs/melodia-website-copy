/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  transpilePackages: [
    "lucide-react",
    "recharts",
    "lodash",
    "date-fns",
    "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-select",
    "@radix-ui/react-slider",
    "@radix-ui/react-slot",
    "@radix-ui/react-toast",
  ],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "lodash",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-toast",
    ],
  },
  async redirects() {
    return [
      {
        source: "/library/:songId",
        destination: "/song/:songId",
        permanent: true,
      },
    ];
  },

  async headers() {
    const noIndexHeaders = [
      {
        key: "X-Robots-Tag",
        value: "noindex, nofollow, noarchive",
      },
    ];

    return [
      // Never index APIs
      { source: "/api/:path*", headers: noIndexHeaders },

      // Auth / account pages
      { source: "/login", headers: noIndexHeaders },
      { source: "/signup", headers: noIndexHeaders },
      { source: "/forgot-password", headers: noIndexHeaders },
      { source: "/reset-password", headers: noIndexHeaders },
      { source: "/verify-forgot-password-otp", headers: noIndexHeaders },
      { source: "/profile/:path*", headers: noIndexHeaders },

      // Private flows / transactional pages
      { source: "/payment", headers: noIndexHeaders },
      { source: "/create-song-request", headers: noIndexHeaders },
      { source: "/generate-lyrics/:path*", headers: noIndexHeaders },
      { source: "/my-songs", headers: noIndexHeaders },
      { source: "/song-options/:path*", headers: noIndexHeaders },
      { source: "/request-capture-success", headers: noIndexHeaders },

      // Admin areas
      { source: "/admin-login", headers: noIndexHeaders },
      { source: "/song-admin-portal/:path*", headers: noIndexHeaders },
    ];
  },

  // Configure image domains and optimization (Vercel serves WebP/AVIF at runtime via Accept header)
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [50, 72, 75, 100],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days for optimized images at edge
    remotePatterns: [
      // Local dev: APIs may return absolute logo URLs (e.g. melodiaLogoUrlForApi) for next/image
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "melodia-songs.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.melodia-songs.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.melodia-songs.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn2.suno.ai",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn1.suno.ai",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lalals.s3.us-east-1.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "musicfile.api.box",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "tempfile.aiquickdraw.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "partner-media.melodia-songs.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.melodia-songs.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pub-f5755a7e6d9747df834a26e8b3432d2b.r2.dev",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

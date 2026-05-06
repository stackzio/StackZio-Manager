import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
    // Client router cache: keep recently-visited pages warm so back/forward and
    // re-visits are instant. Mutations call router.refresh() / revalidatePath()
    // explicitly when data actually changes.
    staleTimes: {
      dynamic: 60, // dynamic routes (most of the app) cached for 60s on the client
      static: 300, // static routes cached for 5 minutes
    },
  },
  transpilePackages: ["@stackzio/db", "@stackzio/lib"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      // Cloudinary delivery URLs
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

// SERVER_API is read at server startup — set this in Azure App Service
// Application Settings (not the client bundle). Never use NEXT_PUBLIC_ here.
const SERVER_API =
  process.env.SERVER_API || "http://localhost:44356";

// Allow self-signed certs from the local .NET dev API over HTTPS.
// This only affects the Next.js proxy process, not the browser.
if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/proxy/:path*",
        destination: `${SERVER_API}/:path*`,
      },
    ];
  },
  
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

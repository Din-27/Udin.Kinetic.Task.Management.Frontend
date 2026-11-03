/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    APP_ENV:
      process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development",
    NEXT_PUBLIC_APP_ENV:
      process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development",
    NEXT_PUBLIC_HAS_GOOGLE: "true",
    NEXT_PUBLIC_GOOGLE_CLIENT_ID:
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      "",
  },
  async rewrites() {
    const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const backendUrl = rawUrl.replace(/\/$/, "");

    return {
      beforeFiles: [
        // 1. Khusus session diarahkan ke server backend Express
        {
          source: "/api/auth/session",
          destination: `${backendUrl}/api/auth/session`,
        },
      ],
      afterFiles: [
        // 2. Seluruh API non-auth (termasuk /api/join-requests, /api/user/123, dsb)
        // diteruskan ke Express, sementara sisa rute auth lokal tetap aman
        {
          source: "/api/:path((?!auth(?:/|$)).*)",
          destination: `${backendUrl}/api/:path`,
        },
      ],
    };
  },
};

export default nextConfig;

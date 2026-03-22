import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static"],
  // Allow Firebase Auth signInWithPopup / Google OAuth to talk to the opener
  // (otherwise COOP can block window.closed)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Firebase Auth signInWithPopup, Google OAuth popup'ının opener ile iletişim kurabilmesi için
  // (aksi halde "Cross-Origin-Opener-Policy would block the window.closed call")
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

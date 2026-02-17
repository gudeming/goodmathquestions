const withNextIntl = require("next-intl/plugin")();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@gmq/api",
    "@gmq/db",
    "@gmq/ui",
    "@gmq/i18n",
    "@gmq/animation-engine",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
    ],
  },
};

module.exports = withNextIntl(nextConfig);

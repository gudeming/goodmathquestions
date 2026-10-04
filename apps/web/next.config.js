const fs = require("fs");
const path = require("path");
const withNextIntl = require("next-intl/plugin")("./i18n/request.ts");

const rootEnvPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(rootEnvPath)) {
  const envContent = fs.readFileSync(rootEnvPath, "utf8");
  for (const rawLine of envContent.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@gmq/api",
    "@gmq/db",
    "@gmq/ui",
    "@gmq/i18n",
    "@gmq/animation-engine",
  ],
  async rewrites() {
    // Standalone single-file tools served from /public.
    return [
      { source: "/bytelab", destination: "/bytelab.html" },
      { source: "/chompulator", destination: "/chompulator.html" },
    ];
  },
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

import "katex/dist/katex.min.css";
import "./globals.css";
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Good Math Questions",
    template: "%s | Good Math Questions",
  },
  description:
    "A fun, interactive math learning platform where kids solve puzzles and build confidence.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}

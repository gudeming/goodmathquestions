import "katex/dist/katex.min.css";
import "./globals.css";

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

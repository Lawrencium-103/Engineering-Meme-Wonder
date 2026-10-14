import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Great_Vibes } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  variable: "--font-great-vibes",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Aravow — An Invitation Worth Keeping Forever",
  description:
    "Premium digital wedding invitations and RSVP for Nigerian weddings. Craft your suite, invite your guests, keep every memory.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      // suppressHydrationWarning: browser extensions (e.g. dark-mode tools)
      // inject attributes onto <html> before hydration; without this flag
      // React flags a false-positive mismatch. Children are NOT affected.
      suppressHydrationWarning
      className={`${cormorant.variable} ${inter.variable} ${greatVibes.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

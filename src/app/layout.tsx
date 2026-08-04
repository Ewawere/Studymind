import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StudyMind — AI Tutor that gets smarter about you every day",
    template: "%s | StudyMind",
  },
  description:
    "The AI tutor built for WAEC, JAMB and real students. Adaptive learning, spaced repetition, homework help and exam mode — designed for African students.",
  keywords: [
    "AI tutor",
    "WAEC",
    "JAMB",
    "study app",
    "flashcards",
    "spaced repetition",
    "Nigeria education",
    "StudyMind",
  ],
  authors: [{ name: "StudyMind" }],
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://studymind.app",
    siteName: "StudyMind",
    title: "StudyMind — AI Tutor that gets smarter about you",
    description:
      "Not another chat wrapper. An AI tutor that learns how you learn.",
  },
  twitter: {
    card: "summary_large_image",
    title: "StudyMind — AI Tutor that gets smarter about you",
    description: "Adaptive AI tutoring for WAEC, JAMB and beyond.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#6366f1",
          colorBackground: "#0a0a0b",
          colorInputBackground: "#18181b",
          colorInputText: "#fafafa",
        },
      }}
    >
      <html lang="en" className="dark">
        <body className={`${inter.variable} font-sans antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

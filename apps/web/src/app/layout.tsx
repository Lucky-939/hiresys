import type { Metadata } from "next";
import { IBM_Plex_Serif, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-serif-val",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-sans-val",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono-val",
});

export const metadata: Metadata = {
  title: "HireSys",
  description: "HireSys - The AI-Powered Hiring Operating System",
  icons: {
    icon: "/branding/logo-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${ibmPlexSerif.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <head>
        <meta name="theme-color" content="#FAFAF8" />
      </head>
      <body className="antialiased font-sans bg-[var(--bg-base)] text-[var(--text-primary)]">
        {children}
        <Toaster position="top-center" toastOptions={{ className: "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-none rounded-[var(--radius-default)]", style: { fontFamily: "var(--font-sans)" } }} />
      </body>
    </html>
  );
}

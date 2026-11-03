import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Kinetic — High-Performance Issue Tracking & Project Management",
  description:
    "A sleek, Linear & Asana-inspired collaborative task management platform. Streamline workflows, track sprints, and sync team tasks with real-time updates.",
  keywords: [
    "Task Management",
    "Issue Tracking",
    "Kanban Board",
    "Project Management",
    "Linear style",
    "Asana style",
    "Agile",
    "Collaboration",
  ],
  authors: [{ name: "Kinetic Team" }],
  creator: "Kinetic",
  publisher: "Kinetic",
  applicationName: "Kinetic Task Management",
  metadataBase: new URL("https://kinetic-task-management.local"),
  openGraph: {
    title: "Kinetic — High-Performance Issue Tracking & Project Management",
    description:
      "Collaborative project management and sprint tracking. Fast, keyboard-first, and built for modern high-velocity teams.",
    type: "website",
    siteName: "Kinetic",
    locale: "id_ID",
    images: [
      {
        url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=630&fit=crop&q=80",
        width: 1200,
        height: 630,
        alt: "Kinetic Issue Tracking Workspace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kinetic — High-Performance Issue Tracking",
    description:
      "A sleek, Linear-inspired collaborative task management platform with real-time updates and seamless team workflow.",
    images: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=630&fit=crop&q=80",
    ],
    creator: "@kinetic",
  },
  robots: {
    index: true,
    follow: true,
  },
};

import { AlertProvider } from "@/components/ui/alert-toast";
import { SessionProvider } from "@/components/providers/session-provider";
import { TranslationProvider } from "@/lib/i18n";
import { TanstackQueryProvider } from "@/components/providers/query-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('kinetic_theme');
                if (saved === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <TanstackQueryProvider>
            <TranslationProvider>
              <AlertProvider>{children}</AlertProvider>
            </TranslationProvider>
          </TanstackQueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

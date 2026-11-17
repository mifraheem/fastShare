import type { Metadata } from "next";
import { Providers } from "./providers";
import "../index.css";

export const metadata: Metadata = {
  title: "FastShare — Private rooms for chat and file sharing",
  description: "Create private rooms. Chat and share files with your team.",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  openGraph: {
    title: "FastShare",
    description: "Private rooms for chat and file sharing.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // next-themes sets the theme class on <html> before hydration
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

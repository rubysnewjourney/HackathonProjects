import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomeBase — Portland First-Time Buyer Intel",
  description:
    "AI-powered multi-agent real estate intelligence for Portland Metro first-time homebuyers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}

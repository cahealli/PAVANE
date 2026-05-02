import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pavane — Agentic Orchestration",
  description: "Visual operating system for agentic code work",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

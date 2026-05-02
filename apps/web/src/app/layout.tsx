import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pavane",
  description: "Sistema operacional visual para trabalho agentic em código",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

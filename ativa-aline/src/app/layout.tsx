import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ativa Aline",
  description: "Automação de Instagram e WhatsApp da Aline Moriano",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

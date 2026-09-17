import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Berichtsheft", template: "%s · Berichtsheft" },
  description: "Digitales Berichtsheft für Auszubildende – schreiben, einreichen, prüfen.",
  applicationName: "Azubi-Berichtsheft",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#1f3fe6", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}

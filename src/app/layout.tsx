import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const { companyName } = await getSettings();
  return { ...metadata, title: { default: `Berichtsheft · ${companyName}`, template: `%s · ${companyName}` } };
}

const metadata: Metadata = {
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

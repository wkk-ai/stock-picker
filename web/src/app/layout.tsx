import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Shell } from "@/components/Shell";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

const iconPath = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/favicon.svg`;

export const metadata: Metadata = {
  title: "Stock Picker BR",
  description: "Brazilian stock research dashboard — decision support, not advice.",
  icons: {
    icon: [{ url: iconPath, type: "image/svg+xml" }],
    apple: iconPath,
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1F33",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${sans.variable} ${mono.variable} font-sans`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}

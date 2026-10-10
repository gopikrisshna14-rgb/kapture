import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/register-sw";

// Self-hosted by next/font: no request to Google from the visitor's browser (GDPR-friendly).
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-bricolage" });
const instrument = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-instrument" });

export const metadata: Metadata = {
  title: "Catch",
  description: "Meet people. Stay in touch.",
  applicationName: "Catch",
  appleWebApp: { capable: true, title: "Catch", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${instrument.variable}`}>
      <body>
        <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-bg">{children}</div>
        <RegisterSW />
      </body>
    </html>
  );
}

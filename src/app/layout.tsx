import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pointer.local"),
  title: {
    default: "Pointer",
    template: "%s | Pointer",
  },
  description: "PWA de controle de ponto com foto obrigatoria, geolocalizacao e trilha de auditoria.",
  applicationName: "Pointer",
  icons: {
    icon: "/brand/logo-simples.png",
    apple: "/brand/logo-simples.png",
    shortcut: "/brand/logo-simples.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pointer",
  },
};

export const viewport: Viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${plusJakarta.variable} ${ibmPlexMono.variable}`}>
      <body>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}

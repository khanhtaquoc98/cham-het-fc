import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import Header from "@/components/Header";
import "./globals.css";

const SITE_URL = "https://chamhetfc.vercel.app";
const SITE_NAME = "Chấm Hết FC";
const SITE_DESCRIPTION =
  "Chấm Hết FC - Đội bóng đá phong trào tại Hồ Chí Minh. Xem đội hình thi đấu, lịch đá bóng, bảng xếp hạng cầu thủ và kết quả trận đấu mới nhất của Chấm Hết FC.";

export const metadata: Metadata = {
  // ── Core ──
  title: {
    default: "Chấm Hết FC | Đội Bóng Đá Phong Trào Hồ Chí Minh",
    template: "%s | Chấm Hết FC",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Chấm Hết FC",
    "chấm hết fc",
    "cham het fc",
    "đội bóng đá phong trào",
    "bóng đá Hồ Chí Minh",
    "football lineup",
    "đội hình thi đấu",
    "bảng xếp hạng cầu thủ",
    "lịch đá bóng",
    "kết quả trận đấu",
    "bóng đá phong trào Hồ Chí Minh",
    "sân bóng Hồ Chí Minh",
  ],
  authors: [{ name: "Chấm Hết FC" }],
  creator: "Chấm Hết FC",
  publisher: "Chấm Hết FC",

  // ── Canonical & Alternates ──
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },

  // ── Open Graph (Facebook, Zalo, Telegram preview) ──
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Chấm Hết FC | Đội Bóng Đá Phong Trào Hồ Chí Minh",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/logo.png`,
        width: 512,
        height: 512,
        alt: "Chấm Hết FC Logo",
      },
    ],
  },

  // ── Twitter Card ──
  twitter: {
    card: "summary",
    title: "Chấm Hết FC | Đội Bóng Đá Phong Trào",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/logo.png`],
  },

  // ── Robots ──
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── PWA ──
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
  },

  // ── Verification (fill in khi đăng ký) ──
  // verification: {
  //   google: "your-google-verification-code",
  // },
};

export const viewport: Viewport = {
  themeColor: "#c62828",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// JSON-LD Structured Data for SportsTeam
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsTeam",
  name: "Chấm Hết FC",
  alternateName: ["Cham Het FC", "chamhetfc"],
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  sport: "Football",
  location: {
    "@type": "Place",
    name: "Đà Nẵng",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Đà Nẵng",
      addressCountry: "VN",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-theme="light" style={{ colorScheme: 'light' }}>
      <head>
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Google Fonts preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* PWA */}
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <Toaster position="top-center" />
        <Header />
        {children}
      </body>
    </html>
  );
}


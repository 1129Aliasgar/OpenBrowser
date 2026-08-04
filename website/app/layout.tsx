import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "../styles/globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import FloatingNav from "@/components/floating-nav";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://openbrowser.ai"),
  title: "OpenBrowser — Open-Source Local AI Coding Agent & Harness",
  description: "Connect ChatGPT, Claude, Gemini, DeepSeek, Perplexity, GLM & Grok to your local workspace without API key costs.",
  manifest: "/site.webmanifest",
  openGraph: {
    title: "OpenBrowser — Local AI Coding Agent",
    description: "Connect ChatGPT, Claude, Gemini & more to your local workspace without API key costs.",
    url: "https://openbrowser.ai",
    siteName: "OpenBrowser",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/assets/banner.png",
        width: 1200,
        height: 630,
        alt: "OpenBrowser — Local AI Coding Agent",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenBrowser — Local AI Coding Agent",
    description: "Connect ChatGPT, Claude, Gemini & more to your local workspace without API key costs.",
    images: ["/assets/banner.png"],
  },
  icons: {
    icon: [
      { url: '/assets/favicon.svg', type: 'image/svg+xml' }
    ],
    shortcut: ['/assets/favicon.svg'],
    apple: ['/assets/favicon.svg']
  }
};

export const viewport = {
  themeColor: "#EE8B50",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col bg-background text-foreground font-sans antialiased selection:bg-brand selection:text-foreground transition-colors duration-250">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "OpenBrowser",
              "applicationCategory": "DeveloperApplication",
              "operatingSystem": "Windows, macOS, Linux",
              "offers": {
                "@type": "Offer",
                "price": "0.00",
                "priceCurrency": "USD"
              }
            })
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="openbrowser-theme"
          disableTransitionOnChange={false}
        >
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <FloatingNav />
        </ThemeProvider>
      </body>
    </html>
  );
}

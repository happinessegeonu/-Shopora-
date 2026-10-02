import type { Metadata } from "next";
import "./globals.css";
import "./checkout.css";
import "./auth.css";
import "./marketplace.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://shopora-amber.vercel.app"),
  title: "Shopora | Shop Electronics, Perfumes & Wigs in Nigeria",
  description: "Shop electronics, perfumes, and wigs at Shopora. Discover everyday essentials and favourite styles with delivery in Nigeria.",
  openGraph: {
    siteName: "Shopora",
    title: "Shopora | Electronics, Perfumes & Wigs",
    description: "Discover electronics, fragrances, and styles for your everyday at Shopora.",
    type: "website",
  },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || "Y_91T6Cqz9WNVcjGDOBIEuJLK-URZOsPSalw6BUsIgw" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const website = { "@context": "https://schema.org", "@type": "WebSite", name: "Shopora", url: "https://shopora-amber.vercel.app/" };
  return <html lang="en"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website).replace(/</g, "\\u003c") }} />{children}</body></html>;
}

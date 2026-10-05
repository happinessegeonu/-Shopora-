import type { Metadata } from "next";
import "./globals.css";
import "./checkout.css";
import "./auth.css";
import "./marketplace.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://shopora-amber.vercel.app"),
  title: "Shopora | Your Everyday Marketplace in Nigeria",
  description: "Discover everyday finds and sell on Shopora in Nigeria. Foodstuff, grocery, fashion, beauty, tech, and home sellers are welcome to submit products for review.",
  openGraph: {
    siteName: "Shopora",
    title: "Shopora | Your Market. Your People.",
    description: "Shop everyday finds. Grow your business with Shopora, a marketplace welcoming foodstuff, fashion, beauty, tech, and home sellers.",
    type: "website",
  },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || "Y_91T6Cqz9WNVcjGDOBIEuJLK-URZOsPSalw6BUsIgw" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const website = { "@context": "https://schema.org", "@type": "WebSite", name: "Shopora", url: "https://shopora-amber.vercel.app/" };
  return <html lang="en"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website).replace(/</g, "\\u003c") }} />{children}</body></html>;
}

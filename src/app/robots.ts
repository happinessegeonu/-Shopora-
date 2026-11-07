import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/account", "/checkout"] },
    sitemap: `${process.env.AUTH_APP_ORIGIN || "https://maketechlimited.com"}/sitemap.xml`,
  };
}

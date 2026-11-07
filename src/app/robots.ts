import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  if (process.env.SHOPORA_PREVIEW === "true") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/account", "/checkout"] },
    sitemap: `${process.env.AUTH_APP_ORIGIN || "https://maketechlimited.com"}/sitemap.xml`,
  };
}

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/checkout"] },
    sitemap: "https://shopora-amber.vercel.app/sitemap.xml",
  };
}

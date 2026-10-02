import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://shopora-amber.vercel.app/", changeFrequency: "weekly", priority: 1 },
    { url: "https://shopora-amber.vercel.app/sell", changeFrequency: "monthly", priority: 0.5 },
  ];
}

import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${process.env.AUTH_APP_ORIGIN || "https://maketechlimited.com"}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${process.env.AUTH_APP_ORIGIN || "https://maketechlimited.com"}/sell`, changeFrequency: "monthly", priority: 0.5 },
  ];
}

import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shopora", short_name: "Shopora", description: "Shop electronics, perfumes and wigs with your synced Shopora account.",
    id: "/app", start_url: "/app", scope: "/", display: "standalone", background_color: "#f7f4ee", theme_color: "#203c32",
    icons: [{ src: "/app-icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}

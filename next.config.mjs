/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  output: "standalone",
  distDir: process.env.SHOPORA_PREVIEW === "true" ? (process.env.SHOPORA_PREVIEW_BUILD_DIR === ".next-preview-e2e" ? ".next-preview-e2e" : ".next-preview") : ".next",
  async redirects() { return [{ source: "/:path*", has: [{ type: "host", value: "www.maketechlimited.com" }], destination: "https://maketechlimited.com/:path*", permanent: true }]; },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
    ] }, { source: "/account", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "no-store" }] }];
  },
};
export default nextConfig;

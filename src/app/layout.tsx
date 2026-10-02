import type { Metadata } from "next";
import "./globals.css";
import "./checkout.css";
import "./auth.css";

export const metadata: Metadata = {
  title: "Shopora — Good things, thoughtfully found",
  description: "A considered collection for everyday living.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

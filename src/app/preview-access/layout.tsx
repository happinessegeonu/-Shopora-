import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default function AccessLayout({ children }: { children: React.ReactNode }) { if (process.env.SHOPORA_PREVIEW !== "true") notFound(); return children; }

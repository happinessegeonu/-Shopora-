import frames from "@/lib/image-frames.json";
type Frame = { width: number; height: number; x: number; y: number; w: number; h: number };
export function ProductImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
 const frame = (frames as Record<string, Frame>)[src.split("/").pop() ?? ""];
 if (["lenovo_thinkpad_t480s.jpg", "logi_125.jpg", "logitech_wireless_340.jpg"].some(name => src.endsWith(name))) return <span className="photo-pending" role="img" aria-label={`${alt}: photo coming soon`}><span>◇</span>Photo coming soon</span>;
 if (!frame || !src.startsWith("/products/")) return <img className={`clean-product-image ${className}`} src={src} alt={alt} loading="lazy" />;
 return <svg className={`clean-product-image ${className}`} viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`} role="img" aria-label={alt} preserveAspectRatio="xMidYMid meet"><title>{alt}</title><image href={src} width={frame.width} height={frame.height} /></svg>;
}

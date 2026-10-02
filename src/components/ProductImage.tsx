export function ProductImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const imageSrc = src.startsWith("/products/") ? `${src}?v=original-20261002` : src;
  return <img className={`clean-product-image ${className}`} src={imageSrc} alt={alt} loading="lazy" decoding="async" />;
}

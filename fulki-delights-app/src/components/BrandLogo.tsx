import reservdWordmark from "@/assets/reservd-wordmark.png";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <img
      src={reservdWordmark}
      alt="Reservd"
      width={1536}
      height={768}
      className={`block h-auto object-contain ${className}`}
    />
  );
}
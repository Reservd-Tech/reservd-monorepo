/** Animated "Reservd." wordmark: floating cloche, bouncing pin, pulsing sparks. */
export function AppLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="grid min-h-[60vh] place-items-center">
      <svg viewBox="0 0 260 110" className="w-56 text-primary" fill="currentColor">
        <g className="loader-spark" style={{ animationDelay: "0ms" }}>
          <rect x="150" y="6" width="4" height="14" rx="2" transform="rotate(-25 152 13)" />
        </g>
        <g className="loader-spark" style={{ animationDelay: "200ms" }}>
          <rect x="160" y="2" width="4" height="16" rx="2" />
        </g>
        <g className="loader-spark" style={{ animationDelay: "400ms" }}>
          <rect x="170" y="6" width="4" height="14" rx="2" transform="rotate(25 172 13)" />
        </g>
        <g className="loader-cloche">
          <path d="M14 46a16 16 0 0 1 32 0z" />
          <circle cx="30" cy="27" r="3" />
          <rect x="10" y="47" width="40" height="3" rx="1.5" />
        </g>
        <text x="8" y="88" fontFamily="var(--font-display)" fontWeight="800" fontSize="52">
          Reservd.
        </text>
        <path d="M60 98 Q140 108 200 96" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse className="loader-shadow" cx="210" cy="104" rx="7" ry="2" opacity="0.3" />
        <g className="loader-pin">
          <path d="M210 84a7 7 0 0 1 7 7c0 5-7 11-7 11s-7-6-7-11a7 7 0 0 1 7-7z" />
          <circle cx="210" cy="91" r="2.5" className="fill-background" />
        </g>
      </svg>
    </div>
  );
}

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Honorar">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#120D24" />
      <path d="M9 8v16M23 8v16" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M9 17c4-6 10-6 14 0" stroke="#8B5CFF" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

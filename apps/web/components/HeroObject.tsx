'use client';

import { motion } from 'motion/react';
import { useRef } from 'react';

const ARC = 'M 70 330 C 150 90, 360 70, 450 250';

/** An arc of light carrying quoted sentences from manuscript pages into a struck coin. */
export function HeroObject() {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1000px) rotateX(${(-y * 12).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg)`;
  };
  return (
    <div
      ref={ref}
      className="hero-object"
      onPointerMove={onMove}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = '';
      }}
      style={{ transition: 'transform 0.3s cubic-bezier(0.2,0.8,0.2,1)' }}
    >
      <svg viewBox="0 0 520 440" width="100%" height="100%" role="img" aria-label="An arc of light carries a quoted sentence from manuscript pages into a coin">
        <defs>
          <linearGradient id="arc" x1="0" x2="1">
            <stop offset="0" stopColor="#DDD0FF" />
            <stop offset="0.5" stopColor="#8B5CFF" />
            <stop offset="1" stopColor="#6A2CF0" />
          </linearGradient>
          <radialGradient id="glow" cx="0.6" cy="0.45" r="0.6">
            <stop offset="0" stopColor="#8B5CFF" stopOpacity="0.5" />
            <stop offset="1" stopColor="#8B5CFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="coin" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.5" stopColor="#E7DEFF" />
            <stop offset="1" stopColor="#B9A2FF" />
          </linearGradient>
          <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        <ellipse cx="320" cy="210" rx="240" ry="190" fill="url(#glow)" />
        <g transform="translate(36 250) rotate(-8)">
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${i * 12} ${-i * 10})`}>
              <rect width="130" height="170" rx="6" fill="#FFFDF8" stroke="#E6DFF5" />
              {[28, 48, 68, 108, 128].map((y) => (
                <rect key={y} x="16" y={y} width={i === 2 ? 98 - ((y * 7) % 30) : 98} height="4" rx="2" fill="#E3DCF2" />
              ))}
              {i === 2 && <rect x="14" y="86" width="102" height="10" rx="3" fill="#8B5CFF" opacity="0.35" />}
            </g>
          ))}
        </g>
        <path d={ARC} stroke="url(#arc)" strokeWidth="14" strokeLinecap="round" fill="none" opacity="0.35" filter="url(#blur)" />
        <path d={ARC} stroke="url(#arc)" strokeWidth="6" strokeLinecap="round" fill="none" />
        <g transform="translate(450 270)">
          <ellipse cx="0" cy="62" rx="62" ry="12" fill="#6A2CF0" opacity="0.2" />
          <circle r="64" fill="url(#coin)" stroke="#fff" strokeWidth="3" />
          <circle r="50" fill="none" stroke="#8B5CFF" strokeOpacity="0.5" strokeWidth="2" />
          <path d="M-16 -22v44M16 -22v44" stroke="#120D24" strokeWidth="7" strokeLinecap="round" />
          <path d="M-16 4c8-12 24-12 32 0" stroke="#6A2CF0" strokeWidth="7" strokeLinecap="round" fill="none" />
        </g>
        {[0, 1, 2].map((i) => (
          <motion.g
            key={i}
            style={{ offsetPath: `path("${ARC}")`, offsetRotate: '0deg' }}
            initial={{ offsetDistance: '0%', opacity: 0 }}
            animate={{ offsetDistance: '100%', opacity: [0, 1, 1, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear', delay: i * 2, times: [0, 0.1, 0.9, 1] }}
          >
            <rect x="-22" y="-16" width="44" height="32" rx="10" fill="rgba(255,255,255,0.82)" stroke="#fff" />
            <text x="0" y="8" textAnchor="middle" fontSize="26" fill="#6A2CF0" fontFamily="Instrument Serif, serif">
              &ldquo;&rdquo;
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  );
}

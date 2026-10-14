'use client';

import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';

const ARC = 'M 470 560 C 560 250, 880 170, 985 330';

function Books({ x, y, n, hue = 0 }: { x: number; y: number; n: number; hue?: number }) {
  const cols = ['#6A2CF0', '#8B5CFF', '#DDD0FF', '#3B3552', '#B9A2FF', '#EFE8FF'];
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: n }).map((_, i) => (
        <rect key={i} x={i * 9} y={-(24 + ((i * 7 + hue) % 14))} width="7.5" height={24 + ((i * 7 + hue) % 14)} rx="1.5" fill={cols[(i + hue) % cols.length]} />
      ))}
    </g>
  );
}

function Laptop({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="-22" width="34" height="22" rx="3" fill="#120D24" />
      <rect x="3" y="-19" width="28" height="16" rx="2" fill="#8B5CFF" opacity="0.8" />
      <rect x="6" y="-15" width="16" height="2" rx="1" fill="#fff" opacity="0.8" />
      <rect x="6" y="-10" width="22" height="2" rx="1" fill="#fff" opacity="0.5" />
      <rect x="-4" y="0" width="42" height="4" rx="2" fill="#3B3552" />
    </g>
  );
}

function Lamp({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <line x1="0" y1="-30" x2="0" y2="0" stroke="#3B3552" strokeWidth="1.5" />
      <path d="M-14 0 Q0 -22 14 0 Z" fill="#6A2CF0" />
      <ellipse cx="0" cy="22" rx="30" ry="14" fill="url(#lampGlow)" />
    </g>
  );
}

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-9 0h18l-3 16h-12z" fill="#3B3552" />
      {[-40, -18, 0, 18, 40].map((r) => (
        <path key={r} d="M0 0C-4 -18 4 -34 0 -46C10 -34 8 -14 0 0Z" fill="#7C5CE0" opacity="0.85" transform={`rotate(${r})`} />
      ))}
    </g>
  );
}

export function HeroScene() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const move = (e: PointerEvent): void => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--px', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
      el.style.setProperty('--py', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  const layer = (d: number): React.CSSProperties => ({
    transform: `translate(calc(var(--px, 0) * ${d}px), calc(var(--py, 0) * ${d * 0.6}px))`,
    transition: 'transform 0.4s cubic-bezier(0.2,0.8,0.2,1)',
  });

  return (
    <div ref={ref} className="hero-scene" aria-hidden="true">
      <svg viewBox="0 0 1200 760" preserveAspectRatio="xMaxYMid slice" width="100%" height="100%">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E9E0FF" />
            <stop offset="0.55" stopColor="#F3D9F5" />
            <stop offset="1" stopColor="#FFE6D5" />
          </linearGradient>
          <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.35" stopColor="#FFE4F0" />
            <stop offset="1" stopColor="#FFE4F0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="slab" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#E4DAF7" />
          </linearGradient>
          <linearGradient id="room" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4B2FA8" />
            <stop offset="1" stopColor="#24124F" />
          </linearGradient>
          <linearGradient id="wall2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2C1766" />
            <stop offset="1" stopColor="#1A0E3C" />
          </linearGradient>
          <linearGradient id="arcg" x1="0" x2="1">
            <stop offset="0" stopColor="#DDD0FF" />
            <stop offset="0.5" stopColor="#B79BFF" />
            <stop offset="1" stopColor="#FFFFFF" />
          </linearGradient>
          <radialGradient id="lampGlow" cx="0.5" cy="0.2" r="0.8">
            <stop offset="0" stopColor="#FFD9A8" stopOpacity="0.85" />
            <stop offset="1" stopColor="#FFD9A8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="vault" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFF4D6" />
            <stop offset="0.6" stopColor="#E7C06B" />
            <stop offset="1" stopColor="#9C6B1F" />
          </radialGradient>
          <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <clipPath id="shell">
            <rect x="400" y="120" width="720" height="560" rx="10" />
          </clipPath>
        </defs>

        <rect width="1200" height="760" fill="url(#sky)" />
        <g style={layer(6)}>
          <circle cx="1020" cy="260" r="190" fill="url(#sun)" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <rect key={i} x={20 + i * 70} y={430 - ((i * 53) % 150)} width={44 + ((i * 17) % 26)} height={330} fill="#C9B8F0" opacity={0.35 + (i % 3) * 0.12} />
          ))}
        </g>
        <g style={layer(10)}>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} opacity="0.55">
              <rect x={1130 + (i % 2) * 30} y={300 + i * 52} width="40" height={460 - i * 52} fill="#A68BE8" />
              {[0, 1, 2].map((w) => (
                <rect key={w} x={1138 + (i % 2) * 30 + w * 11} y={312 + i * 52} width="6" height="14" fill="#FFF" opacity="0.7" />
              ))}
            </g>
          ))}
        </g>

        <g style={layer(14)}>
          <rect x="560" y="46" width="400" height="64" rx="6" fill="#120D24" />
          <rect x="566" y="52" width="388" height="52" rx="4" fill="none" stroke="#8B5CFF" strokeOpacity="0.7" />
          <text x="760" y="92" textAnchor="middle" fontSize="40" letterSpacing="14" fill="#F4F0FF" fontFamily="Geist Variable, sans-serif" fontWeight="300">
            HONORAR
          </text>
          <rect x="400" y="110" width="720" height="14" rx="3" fill="url(#slab)" />
        </g>

        <g style={layer(20)}>
          <rect x="400" y="120" width="720" height="560" rx="10" fill="url(#room)" />
          <g clipPath="url(#shell)">
            <rect x="400" y="120" width="360" height="560" fill="url(#wall2)" opacity="0.55" />
            {[0, 1, 2].map((f) => (
              <g key={f}>
                <rect x="400" y={300 + f * 190 - 14} width="720" height="14" fill="url(#slab)" />
                <path d={`M400 ${300 + f * 190} L1120 ${300 + f * 190} L1120 ${316 + f * 190} L400 ${316 + f * 190}Z`} fill="#000" opacity="0.1" />
              </g>
            ))}
            {[0, 1, 2, 3].map((c) => (
              <line key={c} x1={400 + c * 240} y1="120" x2={400 + c * 240} y2="680" stroke="#EDE6FF" strokeOpacity="0.18" strokeWidth="2" />
            ))}
            {/* floor 1: registry vault */}
            <g>
              <circle cx="640" cy="215" r="74" fill="url(#vault)" stroke="#fff" strokeWidth="3" />
              <circle cx="640" cy="215" r="58" fill="none" stroke="#6A4A10" strokeOpacity="0.6" strokeWidth="2" />
              <circle cx="640" cy="215" r="26" fill="#FFF4D6" stroke="#9C6B1F" strokeWidth="2" />
              {[0, 45, 90, 135].map((a) => (
                <line key={a} x1="640" y1="145" x2="640" y2="285" stroke="#6A4A10" strokeWidth="3" transform={`rotate(${a} 640 215)`} />
              ))}
              <path d="M628 205v20M652 205v20M628 218c8-10 16-10 24 0" stroke="#120D24" strokeWidth="4" strokeLinecap="round" fill="none" />
              <rect x="545" y="270" width="190" height="10" rx="3" fill="#3B3552" />
              <Books x={780} y={282} n={9} />
              <Books x={880} y={282} n={7} hue={3} />
              <Plant x={1070} y={282} s={1.2} />
              <Lamp x={960} y={160} />
            </g>
            {/* floor 2: reading room */}
            <g>
              <rect x="440" y="470" width="640" height="10" rx="3" fill="#3B3552" />
              {[0, 1, 2, 3].map((i) => (
                <g key={i}>
                  <Laptop x={470 + i * 150} y={470} />
                  <rect x={478 + i * 150} y={480} width="4" height="28" fill="#3B3552" />
                  <rect x={520 + i * 150} y={480} width="4" height="28" fill="#3B3552" />
                </g>
              ))}
              {[0, 1, 2].map((i) => (
                <Lamp key={i} x={530 + i * 230} y={355} />
              ))}
              <Books x={1000} y={472} n={5} hue={2} />
            </g>
            {/* floor 3: kernel and ledger */}
            <g>
              <rect x="440" y="650" width="640" height="10" rx="3" fill="#3B3552" />
              <rect x="470" y="602" width="170" height="48" rx="6" fill="#EDE6FF" />
              <rect x="480" y="612" width="150" height="8" rx="3" fill="#8B5CFF" opacity="0.55" />
              <rect x="480" y="628" width="110" height="6" rx="3" fill="#B9A2FF" />
              <path d="M690 650v-60h60v60z" fill="#6A2CF0" />
              <rect x="684" y="582" width="72" height="14" rx="4" fill="#DDD0FF" />
              {[0, 1, 2, 3].map((i) => (
                <ellipse key={i} cx="860" cy={646 - i * 8} rx="30" ry="8" fill="url(#vault)" stroke="#9C6B1F" />
              ))}
              <ellipse cx="960" cy="640" rx="30" ry="8" fill="url(#vault)" stroke="#9C6B1F" />
              <Plant x={1060} y={650} s={1.1} />
            </g>
          </g>
          <rect x="400" y="120" width="720" height="560" rx="10" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="3" />
        </g>

        <g style={layer(30)}>
          <path d={ARC} stroke="url(#arcg)" strokeWidth="26" strokeLinecap="round" fill="none" opacity="0.5" filter="url(#soft)" />
          <path d={ARC} stroke="url(#arcg)" strokeWidth="7" strokeLinecap="round" fill="none" />
          {[0, 1, 2, 3].map((i) => (
            <motion.g
              key={i}
              style={{ offsetPath: `path("${ARC}")`, offsetRotate: '0deg' }}
              initial={{ offsetDistance: '0%', opacity: 0 }}
              animate={{ offsetDistance: '100%', opacity: [0, 1, 1, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'linear', delay: i * 1.75, times: [0, 0.1, 0.9, 1] }}
            >
              <rect x="-26" y="-18" width="52" height="36" rx="11" fill="rgba(255,255,255,0.88)" stroke="#fff" />
              <text x="0" y="9" textAnchor="middle" fontSize="30" fill="#6A2CF0" fontFamily="Instrument Serif, serif">
                &ldquo;&rdquo;
              </text>
            </motion.g>
          ))}
        </g>

        <g style={layer(36)}>
          <path d="M0 700 L1200 700 L1200 760 L0 760Z" fill="#EDE6FF" opacity="0.8" />
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={i} x1={600 + (i - 7) * 20} y1="700" x2={600 + (i - 7) * 150} y2="760" stroke="#B9A2FF" strokeOpacity="0.5" />
          ))}
          <ellipse cx="760" cy="716" rx="420" ry="14" fill="#6A2CF0" opacity="0.12" />
          <motion.g className="scene-chip" animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
            <rect x="1010" y="520" width="150" height="60" rx="16" fill="rgba(255,255,255,0.86)" stroke="#fff" />
            <circle cx="1038" cy="550" r="12" fill="#B9F3D6" />
            <path d="M1032 550l5 5 9-10" stroke="#0B6B45" strokeWidth="3" fill="none" strokeLinecap="round" />
            <text x="1058" y="546" fontSize="11" fill="#120D24" fontFamily="Geist Mono Variable, monospace">
              Struck · final
            </text>
            <text x="1058" y="562" fontSize="10" fill="#6C6683" fontFamily="Geist Mono Variable, monospace">
              0.004 USDC
            </text>
          </motion.g>
          <motion.g className="scene-chip" animate={{ y: [0, 7, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
            <rect x="860" y="196" width="190" height="62" rx="16" fill="rgba(255,255,255,0.86)" stroke="#fff" />
            <rect x="874" y="210" width="8" height="34" rx="3" fill="#8B5CFF" />
            <text x="892" y="222" fontSize="11" fill="#120D24" fontFamily="Geist Mono Variable, monospace">
              In the source ✓
            </text>
            <text x="892" y="240" fontSize="11" fill="#120D24" fontFamily="Geist Mono Variable, monospace">
              In the answer ✓
            </text>
          </motion.g>
          <motion.g className="scene-chip" animate={{ y: [0, -6, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
            <rect x="760" y="560" width="170" height="52" rx="14" fill="rgba(255,255,255,0.86)" stroke="#fff" />
            <text x="776" y="582" fontSize="11" fill="#B42318" fontFamily="Geist Mono Variable, monospace">
              REFUSED_NOT_IN_SOURCE
            </text>
            <text x="776" y="600" fontSize="10" fill="#6C6683" fontFamily="Geist Mono Variable, monospace">
              unpaid, shown
            </text>
          </motion.g>
        </g>
      </svg>
    </div>
  );
}

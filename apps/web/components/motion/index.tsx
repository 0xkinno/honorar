'use client';

import { motion, useInView, MotionConfig, animate } from 'motion/react';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useStickyProgress } from './scroll-engine';

const EASE = [0.2, 0.8, 0.2, 1] as const;

export function Motion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function Words({ text, accent, className }: { text: string; accent?: string; className?: string }) {
  const words = text.split(' ');
  const all = accent ? [...words, `__${accent}`] : words;
  return (
    <span className={className} aria-label={`${text}${accent ? ` ${accent}` : ''}`}>
      {all.map((w, i) => {
        const isAccent = w.startsWith('__');
        return (
          <motion.span
            key={`${w}-${i}`}
            aria-hidden="true"
            initial={{ opacity: 0, y: '0.5em', filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.055 }}
            style={{ display: 'inline-block', marginRight: '0.25em' }}
          >
            {isAccent ? <em>{w.slice(2)}</em> : w}
          </motion.span>
        );
      })}
    </span>
  );
}

export function Reveal({ children, delay = 0, className, style }: { children: ReactNode; delay?: number; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, value, { duration: 1.4, ease: EASE, onUpdate: (v) => setShown(v) });
    return () => c.stop();
  }, [inView, value]);
  return (
    <span ref={ref} className="mono">
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Card with pointer glow and a gentle tilt (max 6 degrees). */
export function GlowCard({ children, className = '', style, tilt = true }: { children: ReactNode; className?: string; style?: CSSProperties; tilt?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent<HTMLDivElement>): void => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
    if (tilt && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.transform = `perspective(900px) rotateX(${((0.5 - y) * 6).toFixed(2)}deg) rotateY(${((x - 0.5) * 6).toFixed(2)}deg)`;
    }
  };
  const leave = (): void => {
    if (ref.current) ref.current.style.transform = '';
  };
  return (
    <div ref={ref} className={`card ${className}`} style={{ ...style, transition: 'transform 0.25s cubic-bezier(0.2,0.8,0.2,1), border-color 0.2s' }} onPointerMove={move} onPointerLeave={leave}>
      {children}
    </div>
  );
}

/** Tall section with a sticky stage. Exposes --p (0..1) on the wrapper. */
export function StickyStage({ height = '300vh', children, className }: { height?: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  useStickyProgress(ref);
  return (
    <section ref={ref} className={`sticky-track ${className ?? ''}`} style={{ height, ['--p' as string]: 0 }}>
      <div className="sticky-stage">{children}</div>
    </section>
  );
}

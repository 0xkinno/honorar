'use client';

import { useEffect, type RefObject } from 'react';

type Frame = (dt: number) => boolean | void;
const frames = new Set<Frame>();
let raf = 0;
let last = 0;

function loop(t: number): void {
  raf = 0;
  const dt = last ? Math.min(64, t - last) : 16;
  last = t;
  let busy = false;
  frames.forEach((f) => {
    if (f(dt)) busy = true;
  });
  if (busy) raf = requestAnimationFrame(loop);
  else last = 0;
}

export const kick = (): void => {
  if (!raf && typeof window !== 'undefined') raf = requestAnimationFrame(loop);
};
export const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
export const approach = (cur: number, target: number, dt: number, tau = 80): number => cur + (target - cur) * (1 - Math.exp(-dt / tau));

export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Registers fn while mounted; it runs on scroll and resize and while it returns true. */
export function useFrame(fn: Frame): void {
  useEffect(() => {
    frames.add(fn);
    const wake = (): void => kick();
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake);
    kick();
    return () => {
      frames.delete(fn);
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', wake);
    };
  }, [fn]);
}

/** Writes eased --p (0..1) on a tall sticky section. React never re-renders on scroll. */
export function useStickyProgress(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cur = 0;
    const f: Frame = (dt) => {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const target = total > 0 ? clamp(-r.top / total) : 0;
      cur = reducedMotion() ? target : approach(cur, target, dt, 70);
      el.style.setProperty('--p', cur.toFixed(4));
      return Math.abs(cur - target) > 0.0005;
    };
    frames.add(f);
    const wake = (): void => kick();
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake);
    kick();
    return () => {
      frames.delete(f);
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', wake);
    };
  }, [ref]);
}

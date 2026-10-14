'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';

const items = [
  { href: '/#product', label: 'Product', match: '/', hide: true },
  { href: '/#how', label: 'How it pays', match: '/#how', hide: true },
  { href: '/proof', label: 'Proof', match: '/proof', hide: false },
  { href: '/verify', label: 'Verify', match: '/verify', hide: false },
  { href: '/credits', label: 'Docs', match: '/credits', hide: false, xs: true },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="nav">
      <Link href="/" className="logo" aria-label="Honorar home">
        <Logo size={22} />
        <span>HONORAR</span>
      </Link>
      <nav aria-label="Primary">
        <ul className="nav-links">
          {items.map((it) => {
            const active = it.match === path && it.label !== 'Product';
            return (
              <li key={it.label} className={`${it.hide ? 'hide-sm' : ''} ${'xs' in it && it.xs ? 'hide-xs' : ''}`}>
                <Link href={it.href} className="nav-item" aria-current={active ? 'page' : undefined}>
                  {active && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <Link href="/app/ask" className="btn dark small">
        Open app
      </Link>
    </header>
  );
}

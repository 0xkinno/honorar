'use client';

import { motion } from 'motion/react';
import { BookOpen, Coins, Fingerprint, MessageSquare, ScrollText, ShieldCheck, Bot } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';
import { WalletButton } from '@/components/WalletButton';

const items = [
  { href: '/app/ask', label: 'Ask', icon: MessageSquare },
  { href: '/app/library', label: 'Library', icon: BookOpen },
  { href: '/app/earnings', label: 'Earnings', icon: Coins },
  { href: '/app/ledger', label: 'Ledger', icon: ScrollText },
  { href: '/verify', label: 'Verify', icon: Fingerprint },
  { href: '/proof', label: 'Proof', icon: ShieldCheck },
  { href: '/app/agent', label: 'Agent', icon: Bot },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="App navigation">
        <div className="sidebar-inner">
          <Link href="/" className="logo" style={{ padding: '6px 8px 14px' }}>
            <Logo size={24} />
            <span>HONORAR</span>
          </Link>
          {items.map((it) => {
            const active = path === it.href;
            return (
              <Link key={it.href} href={it.href} className="side-item" aria-current={active ? 'page' : undefined}>
                {active && <motion.span layoutId="side-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                <it.icon size={18} />
                {it.label}
              </Link>
            );
          })}
        </div>
      </aside>
      <div style={{ minWidth: 0 }}>
        <nav className="mobile-bar" aria-label="App navigation">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="chip" aria-current={path === it.href ? 'page' : undefined} style={{ textDecoration: 'none', whiteSpace: 'nowrap', outline: path === it.href ? '1px solid var(--violet)' : 'none' }}>
              {it.label}
            </Link>
          ))}
        </nav>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px clamp(16px,3vw,40px) 0' }}>
          <WalletButton />
        </div>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}

import Link from 'next/link';
import type { ReactNode } from 'react';
import { txUrl } from '@honorar/chain';

export const Skeleton = ({ h = 20, w = '100%' }: { h?: number; w?: string | number }) => <div className="skeleton" style={{ height: h, width: w }} />;

export function Notice({ tone = 'warn', children }: { tone?: 'warn' | 'bad' | 'ok'; children: ReactNode }) {
  return (
    <div className="card" role="status" style={{ padding: 16, borderColor: tone === 'bad' ? 'var(--bad)' : undefined }}>
      <span className={`chip ${tone}`}>{tone === 'bad' ? 'Problem' : tone === 'ok' ? 'Ready' : 'Note'}</span> <span style={{ marginLeft: 8 }}>{children}</span>
    </div>
  );
}

export function TxLink({ hash, label }: { hash: string; label?: string }) {
  return (
    <Link className="mono" href={txUrl(hash)} target="_blank" rel="noreferrer">
      {label ?? `${hash.slice(0, 10)}...${hash.slice(-6)}`}
    </Link>
  );
}

export function PageHead({ title, kicker, children }: { title: string; kicker: string; children?: ReactNode }) {
  return (
    <header style={{ marginBottom: 28 }}>
      <p className="kicker">{kicker}</p>
      <h1 className="h2" style={{ margin: '8px 0 10px' }}>
        {title}
      </h1>
      {children && <p style={{ color: 'var(--ink-2)', maxWidth: 720, margin: 0 }}>{children}</p>}
    </header>
  );
}

export const usdc = (base: string | bigint): string => {
  const n = BigInt(base);
  return `${n / 1_000_000n}.${(n % 1_000_000n).toString().padStart(6, '0')}`;
};

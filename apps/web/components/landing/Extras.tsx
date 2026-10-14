'use client';

import { GlowCard, Reveal } from '../motion';

const MARQUEE = ['Arc mainnet', 'Circle Gateway nanopayments', 'USDC gas', 'ERC-8004 identity', 'Merkle roots on chain', 'Offline verifier', 'x402', 'Deterministic finality'];

export function Marquee() {
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {items.map((m, i) => (
          <span key={i} className="mono">
            <span className="dot" /> {m}
          </span>
        ))}
      </div>
    </div>
  );
}

type IconKey = 'book' | 'coin' | 'check' | 'tree' | 'clock' | 'lock';

const BENTO: { t: string; d: string; icon: IconKey }[] = [
  { t: 'Per sentence, not per site', d: 'Each verified quote earns its own honorarium, priced by the writer on chain.', icon: 'coin' },
  { t: 'Exact-span receipts', d: 'The earnings page shows the sentence, the answer it went into and the transaction.', icon: 'book' },
  { t: 'Kernel, not vibes', d: 'A quote is paid only if it is in the source and in the answer. Paraphrase is refused.', icon: 'check' },
  { t: 'One root per answer', d: 'Leaves fold into a Merkle root committed in the same transaction that pays.', icon: 'tree' },
  { t: 'Un-netted reading fees', d: 'Gateway batches hide individual payments. The reconciler pulls each one back out.', icon: 'clock' },
  { t: 'No custody', d: 'The ledger never holds money. A reader mandate caps every answer and every day.', icon: 'lock' },
];

function Icon({ k }: { k: IconKey }) {
  const c = { fill: 'none', stroke: '#6A2CF0', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="18" fill="#EFE8FF" />
      <circle cx="46" cy="18" r="14" fill="#DDD0FF" opacity="0.7" />
      {k === 'coin' && (
        <g {...c}>
          <circle cx="32" cy="32" r="14" />
          <path d="M26 24v16M38 24v16M26 33c4-6 8-6 12 0" />
        </g>
      )}
      {k === 'book' && (
        <g {...c}>
          <path d="M18 20c5-3 10-3 14 1 4-4 9-4 14-1v26c-5-3-10-3-14 1-4-4-9-4-14-1z" />
          <path d="M32 21v26" />
        </g>
      )}
      {k === 'check' && (
        <g {...c}>
          <path d="M22 32l8 8 14-16" />
          <rect x="14" y="14" width="36" height="36" rx="10" />
        </g>
      )}
      {k === 'tree' && (
        <g {...c}>
          <circle cx="32" cy="16" r="5" />
          <circle cx="18" cy="46" r="5" />
          <circle cx="46" cy="46" r="5" />
          <path d="M32 21v9M32 30L18 41M32 30l14 11" />
        </g>
      )}
      {k === 'clock' && (
        <g {...c}>
          <circle cx="32" cy="32" r="15" />
          <path d="M32 22v10l7 4" />
        </g>
      )}
      {k === 'lock' && (
        <g {...c}>
          <rect x="18" y="29" width="28" height="19" rx="6" />
          <path d="M24 29v-6a8 8 0 0116 0v6" />
        </g>
      )}
    </svg>
  );
}

export function Bento() {
  return (
    <section className="wrap" style={{ padding: '72px 0' }}>
      <Reveal>
        <p className="kicker">What is inside</p>
        <h2 className="h2" style={{ margin: '12px 0 28px', maxWidth: 820 }}>
          A press house for <span className="serif-accent">machine readers.</span>
        </h2>
      </Reveal>
      <div className="grid-3">
        {BENTO.map((b, i) => (
          <Reveal key={b.t} delay={(i % 3) * 0.07}>
            <GlowCard style={{ height: '100%' }}>
              <Icon k={b.icon} />
              <h3 style={{ fontSize: 24, margin: '16px 0 8px' }}>{b.t}</h3>
              <p style={{ margin: 0, color: 'var(--ink-2)' }}>{b.d}</p>
            </GlowCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Story() {
  const steps = ['Writes once, registers with her wallet', 'Agents open her article: a reading fee', 'An answer quotes her: an honorarium, with a receipt'];
  return (
    <section className="wrap" style={{ padding: '24px 0 96px' }}>
      <GlowCard tilt={false} style={{ padding: 'clamp(24px,5vw,56px)' }}>
        <div className="grid-2" style={{ alignItems: 'center', gap: 32 }}>
          <div>
            <p className="kicker">The writer</p>
            <h2 className="h2" style={{ margin: '10px 0 16px' }}>
              Ifeoma, Lagos. <span className="serif-accent">Read daily. Paid never.</span>
            </h2>
            <p style={{ color: 'var(--ink-2)' }}>
              She writes deep explainers on stablecoins. Assistants clearly read her, she sees her phrasing in their answers, and she has no way to prove which sentences they used. With Honorar she registers once, and every quote shows up with its sentence and its transaction.
            </p>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {steps.map((t, i) => (
              <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 16px', borderRadius: 18, background: 'rgba(255,255,255,0.7)', border: '1px solid var(--glass-line)' }}>
                <span className="mono" style={{ color: 'var(--violet)' }}>{`0${i + 1}`}</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </GlowCard>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { AGENT_URL, type Stats } from '@/lib/api';
import { CountUp, GlowCard, Reveal, StickyStage, Words } from '../motion';
import { HeroScene } from '../HeroScene';

export type FeaturedProps = {
  sentence: string;
  workTitle: string;
  contentHash: string;
  answerId: string;
  strikeTx: string;
  block: number;
  amount: string;
  batchTx: string | null;
  medianSeconds: number | null;
} | null;

export type BenchProps = { misdirectedPct: Record<string, number>; questions: number } | null;

const short = (h: string): string => `${h.slice(0, 8)}...${h.slice(-6)}`;

function useStats(): Stats | null {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    if (!AGENT_URL) return;
    let live = true;
    fetch(`${AGENT_URL}/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Stats | null) => live && setS(j))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return s;
}

export function Hero({ questions, featured }: { questions: string[]; featured: FeaturedProps }) {
  const stats = useStats();
  const live = (stats?.strikes ?? 0) > 0;
  return (
    <section className="hero-card" id="product">
      <HeroScene />
      <div className="hero-fade" />
      <div className="hero-grid">
        <div>
          <p className="kicker">
            <span className={`dot ${live ? 'live' : ''}`} />
            Live on Arc mainnet
          </p>
          <h1 className="display" style={{ margin: '18px 0 20px' }}>
            <Words text="EVERY QUOTE" accent="earns" />
            <br />
            <Words text="A FEE." />
          </h1>
          <p style={{ fontSize: 'clamp(17px, 2vw, 21px)', color: 'var(--ink-2)', maxWidth: 560, margin: '0 0 26px' }}>
            Honorar pays writers every time an AI quotes them, and shows them the exact sentence that earned it. Per-stream royalties, for the words AI reads. Settled in USDC on Arc.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/app/ask" className="btn dark">
              Ask without a wallet
            </Link>
            <a href="#follow" className="btn glass">
              Follow one sentence
            </a>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 22 }}>
            {questions.slice(0, 4).map((q) => (
              <Link key={q} href={`/app/ask?q=${encodeURIComponent(q)}`} className="chip" style={{ textDecoration: 'none' }}>
                {q}
              </Link>
            ))}
          </div>
        </div>
        <div />
      </div>
      <div className="ticker" aria-live="polite">
        {featured
          ? `${featured.amount} USDC to the writer for "${featured.sentence.slice(0, 48)}..." · tx ${short(featured.strikeTx)}`
          : 'Waiting for the first strike on Arc mainnet'}
      </div>
    </section>
  );
}

const BEATS = [
  { title: 'Written', body: 'A writer registers an article once. Its content hash is committed on Arc.' },
  { title: 'Read', body: 'An agent opens the page. A reading fee starts its clock: Authorized.' },
  { title: 'Quoted', body: 'The sentence is lifted into an answer, inside quotation marks.' },
  { title: 'Checked', body: 'In the source. In the answer. A fabricated citation is stopped: REFUSED_NOT_IN_SOURCE.' },
  { title: 'Struck', body: 'The verified sentence becomes a Merkle leaf. The root and the payment land in one transaction.' },
  { title: 'Netted, then un-netted', body: 'The reading fee joins a batch of other payers. The reconciler pulls it back out: Batched, Confirmed, Settled.' },
  { title: 'Paid, provably', body: 'The earnings card names the sentence, the answer, the transaction. Anyone can verify it.' },
] as const;

function beatStyle(i: number): CSSProperties {
  const s = i / 7;
  const e = (i + 1) / 7;
  const fadeOut = i === 6 ? '1' : `clamp(0, (${e} - var(--p)) * 18, 1)`;
  return {
    opacity: `calc(clamp(0, (var(--p) - ${s}) * 18, 1) * ${fadeOut})`,
    transform: `translateY(calc((1 - clamp(0, (var(--p) - ${s}) * 18, 1)) * 24px))`,
  } as CSSProperties;
}

export function Follow({ f }: { f: FeaturedProps }) {
  return (
    <div id="follow">
      <StickyStage height="520vh">
        <div className="wrap" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,0.8fr) minmax(0,1.2fr)', gap: 32, alignItems: 'center' }}>
          <div className="follow-index">
            <p className="kicker">01 · Follow one sentence</p>
            <h2 className="h2" style={{ margin: '12px 0 20px' }}>
              One sentence, <span className="serif-accent">paid.</span>
            </h2>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
              {BEATS.map((b, i) => (
                <li
                  key={b.title}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 12,
                    border: '1px solid var(--violet)',
                    boxShadow: 'var(--neon)',
                    background: 'rgba(255,255,255,0.7)',
                    opacity: `calc(0.28 + 0.72 * clamp(0, 1 - abs((var(--p) - ${(i + 0.5) / 7}) * 7), 1))` as unknown as number,
                  }}
                >
                  <span className="mono" style={{ color: 'var(--muted)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>{' '}
                  {b.title}
                </li>
              ))}
            </ol>
          </div>
          <GlowCard tilt={false} style={{ minHeight: 380, padding: 32 }}>
            <div style={{ position: 'relative', minHeight: 320 }}>
              {BEATS.map((b, i) => (
                <div key={b.title} style={{ position: 'absolute', inset: 0, ...beatStyle(i) }}>
                  <p className="kicker">{`Beat ${i + 1} of 7`}</p>
                  <h3 style={{ fontSize: 'clamp(26px, 3.4vw, 40px)', margin: '8px 0 12px' }}>{b.title}</h3>
                  <p style={{ color: 'var(--ink-2)', maxWidth: 520 }}>{b.body}</p>
                  <div style={{ marginTop: 20, display: 'grid', gap: 8 }}>
                    {f ? (
                      <>
                        <p style={{ margin: 0, padding: '12px 14px', borderRadius: 14, background: 'var(--violet-dim)' }}>
                          <span className="serif-accent" style={{ fontSize: 22 }}>
                            &ldquo;{f.sentence}&rdquo;
                          </span>
                        </p>
                        <span className="mono" style={{ color: 'var(--muted)' }}>
                          hash {short(f.contentHash)} · struck {f.amount} USDC · block {f.block} · tx {short(f.strikeTx)}
                          {f.batchTx ? ` · batch ${short(f.batchTx)}` : ''}
                          {f.medianSeconds !== null ? ` · median ${f.medianSeconds}s` : ''}
                        </span>
                      </>
                    ) : (
                      <span className="chip warn">This beat fills from the first mainnet answer</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>
        </div>
      </StickyStage>
    </div>
  );
}

export function Problem({ bench, e1 }: { bench: BenchProps; e1: { p50: number | null; completedPct: number | null } }) {
  const cards: { label: string; value: number | null; suffix: string; decimals: number; note: string }[] = [
    {
      label: 'Money misdirected by model self-citation',
      value: bench?.misdirectedPct.modelAttribution ?? null,
      suffix: '%',
      decimals: 1,
      note: bench ? `measured over ${bench.questions} questions` : 'benchmark pending',
    },
    {
      label: 'Money misdirected by Honorar verified quotes',
      value: bench?.misdirectedPct.honorar ?? null,
      suffix: '%',
      decimals: 1,
      note: bench ? 'same answers, same corpus' : 'benchmark pending',
    },
    {
      label: 'Median seconds from authorization to settled',
      value: e1.p50,
      suffix: 's',
      decimals: 1,
      note: e1.completedPct !== null ? `${e1.completedPct}% reached completed` : 'measurement pending',
    },
  ];
  return (
    <section className="wrap" style={{ padding: '96px 0' }}>
      <Reveal>
        <p className="kicker">02 · The problem, measured</p>
        <h2 className="h2" style={{ margin: '12px 0 32px', maxWidth: 900 }}>
          A citation is a claim. A payment should be <span className="serif-accent">proof.</span>
        </h2>
      </Reveal>
      <div className="grid-3">
        {cards.map((c, i) => (
          <Reveal key={c.label} delay={i * 0.07}>
            <GlowCard style={{ height: '100%' }}>
              <div style={{ fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 200 }}>{c.value === null ? <span className="skeleton" style={{ display: 'inline-block', width: 120, height: 48 }} /> : <CountUp value={c.value} decimals={c.decimals} suffix={c.suffix} />}</div>
              <p style={{ margin: '8px 0 4px' }}>{c.label}</p>
              <span className="mono" style={{ color: 'var(--muted)' }}>
                {c.note}
              </span>
            </GlowCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { n: '01', t: 'Register', d: 'A writer signs one transaction. The content hash, price per read and price per quote live on Arc.' },
  { n: '02', t: 'Read', d: 'Every source an agent opens is a real nanopayment through Circle Gateway, capped and pinned to the registered payee.' },
  { n: '03', t: 'Quote', d: 'The model proposes citations. The kernel keeps only sentences that are in the source and in the answer.' },
  { n: '04', t: 'Strike', d: 'One transaction commits the Merkle root and pays writers, the protocol fee and the reading fees fronted.' },
];

export function HowItPays() {
  return (
    <section className="wrap" id="how" style={{ padding: '48px 0 96px' }}>
      <p className="kicker">03 · How it pays</p>
      <h2 className="h2" style={{ margin: '12px 0 32px' }}>
        Four moves, <span className="serif-accent">one</span> receipt.
      </h2>
      {STEPS.map((s, i) => (
        <div key={s.n} className="stack-card" style={{ ['--i' as string]: i }}>
          <GlowCard style={{ background: 'rgba(255,255,255,0.86)' }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span className="mono" style={{ color: 'var(--violet)', fontSize: 18 }}>
                {s.n}
              </span>
              <h3 style={{ fontSize: 'clamp(26px, 3vw, 38px)' }}>{s.t}</h3>
            </div>
            <p style={{ color: 'var(--ink-2)', maxWidth: 680, marginBottom: 0 }}>{s.d}</p>
          </GlowCard>
        </div>
      ))}
    </section>
  );
}

export function TwoClocks({ medianSeconds }: { medianSeconds: number | null }) {
  const states = ['Authorized', 'Batched', 'Confirmed', 'Settled on Arc'];
  return (
    <StickyStage height="300vh">
      <div className="wrap">
        <p className="kicker">04 · Two clocks</p>
        <h2 className="h2" style={{ margin: '12px 0 28px' }}>
          Final now. Final <span className="serif-accent">later.</span>
        </h2>
        <div className="grid-2">
          <GlowCard tilt={false}>
            <p className="kicker">Honorarium</p>
            <div style={{ height: 10, borderRadius: 6, background: 'var(--paper-2)', overflow: 'hidden', margin: '16px 0' }}>
              <div style={{ height: '100%', background: 'var(--ok)', width: 'calc(clamp(0, var(--p) * 6, 1) * 100%)' }} />
            </div>
            <span className="chip ok">Struck · final in one block</span>
          </GlowCard>
          <GlowCard tilt={false}>
            <p className="kicker">Reading fee</p>
            <div style={{ height: 10, borderRadius: 6, background: 'var(--paper-2)', overflow: 'hidden', margin: '16px 0' }}>
              <div style={{ height: '100%', background: 'var(--violet)', width: 'calc(clamp(0, (var(--p) - 0.15) * 1.3, 1) * 100%)' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {states.map((s, i) => (
                <span key={s} className={`chip ${i === 0 ? 'warn' : i === 3 ? 'ok' : ''}`}>
                  {s}
                </span>
              ))}
            </div>
            <p className="mono" style={{ color: 'var(--muted)', marginBottom: 0 }}>
              {medianSeconds !== null ? `median ${medianSeconds}s to settled (measured)` : 'timing pending measurement'}
            </p>
          </GlowCard>
        </div>
      </div>
    </StickyStage>
  );
}

const ROWS = [
  { who: 'Model', rule: 'Proposes who to credit. Never an amount, an address or a price.', inv: 'I10' },
  { who: 'Kernel', rule: 'Keeps only quotes that are in the source and in the answer. Adds the ones the model missed.', inv: 'I1 I2 I3' },
  { who: 'Ledger', rule: 'Takes prices from the registry, enforces mandate caps and once-only strikes, holds no money.', inv: 'I4 I5 I6 I7' },
  { who: 'Arc', rule: 'Decides what happened. Reading fees are un-netted from Gateway batches and reconciled.', inv: 'I8 I9' },
];

export function Decides() {
  return (
    <section className="wrap" style={{ padding: '96px 0' }}>
      <p className="kicker">05 · What may decide what</p>
      <h2 className="h2" style={{ margin: '12px 0 28px' }}>
        The model proposes. Code <span className="serif-accent">decides.</span>
      </h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {ROWS.map((r) => (
          <GlowCard key={r.who}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px,160px) 1fr auto', gap: 16, alignItems: 'baseline' }}>
              <h3 style={{ fontSize: 28 }}>{r.who}</h3>
              <p style={{ margin: 0, color: 'var(--ink-2)' }}>{r.rule}</p>
              <span className="chip">{r.inv}</span>
            </div>
          </GlowCard>
        ))}
      </div>
    </section>
  );
}

export type ProofTile = { label: string; value: number | null; href: string; suffix?: string };

export function ProofStrip({ tiles }: { tiles: ProofTile[] }) {
  return (
    <section className="wrap" style={{ padding: '48px 0 96px' }}>
      <p className="kicker">06 · Proof, live</p>
      <h2 className="h2" style={{ margin: '12px 0 28px' }}>
        Counted from the chain and from <span className="serif-accent">files.</span>
      </h2>
      <div className="grid-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} style={{ textDecoration: 'none' }}>
            <GlowCard>
              <div style={{ fontSize: 44, fontWeight: 200 }}>{t.value === null ? <span className="chip warn">pending</span> : <CountUp value={t.value} suffix={t.suffix ?? ''} />}</div>
              <span className="kicker">{t.label}</span>
            </GlowCard>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function Audience() {
  return (
    <section className="wrap" style={{ padding: '0 0 96px' }}>
      <p className="kicker">07 · For writers, for agents</p>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <GlowCard>
          <h3 style={{ fontSize: 34 }}>Register a work</h3>
          <p style={{ color: 'var(--ink-2)' }}>Paste a URL, set two prices, sign once. Your Earnings page shows each sentence and each transaction.</p>
          <Link className="btn dark" href="/app/library">
            Open the library
          </Link>
        </GlowCard>
        <GlowCard>
          <h3 style={{ fontSize: 34 }}>Pay writers from your agent</h3>
          <p style={{ color: 'var(--ink-2)' }}>Use the public API, set a hard on-chain cap, and let anyone verify the receipts.</p>
          <Link className="btn glass" href="/verify">
            Verify an answer
          </Link>
        </GlowCard>
      </div>
    </section>
  );
}

export function Close() {
  return (
    <section className="dark-section">
      <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
        <h2 className="display" style={{ fontSize: 'clamp(40px, 7vw, 96px)', color: '#fff' }}>
          Honorar pays writers every time an AI <em style={{ color: '#b79bff' }}>quotes</em> them.
        </h2>
        <p style={{ color: '#cfc4f5', maxWidth: 620 }}>The model proposed. The kernel decided. Arc settled.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '24px 0 56px' }}>
          <Link href="/app/ask" className="btn violet">
            Ask without a wallet
          </Link>
          <Link href="/verify" className="btn glass" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}>
            Verify an answer
          </Link>
        </div>
        <footer style={{ display: 'flex', gap: 20, flexWrap: 'wrap', color: '#b8acdf', fontSize: 14 }}>
          <Link href="/proof">Proof</Link>
          <Link href="/app/ledger">Ledger</Link>
          <Link href="/credits">Credits</Link>
          <span>Built by 0xkinno</span>
        </footer>
      </div>
    </section>
  );
}

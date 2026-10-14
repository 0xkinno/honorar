'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import { erc20Abi, parseAbi } from 'viem';
import { ADDRESSES, ARC_CHAIN_ID, formatUsdc6, parseUsdc6 } from '@honorar/chain';
import { AGENT_URL, clockLabel, type TransferView } from '@/lib/api';
import { useAgentConfig } from '@/lib/hooks';
import { Notice, PageHead, Skeleton, TxLink, usdc } from '@/components/ui';

type Ev = { stage: string; [k: string]: unknown };

const ledgerAbi = parseAbi(['function setMandate(uint64 maxPerAnswer, uint64 maxPer24h)', 'function mandates(address) view returns (uint64,uint64,uint64,uint64,bool)']);

function Stream({ events }: { events: Ev[] }) {
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }} aria-live="polite">
      {events.map((e, i) => (
        <li key={i} className="card" style={{ padding: 16 }}>
          <span className="kicker">{e.stage}</span>
          <div style={{ marginTop: 6, fontSize: 14 }}>{describe(e)}</div>
        </li>
      ))}
    </ol>
  );
}

function describe(e: Ev): React.ReactNode {
  switch (e.stage) {
    case 'retrieve':
      return `${(e.candidates as unknown[]).length} registered works matched`;
    case 'decide':
      return `Opening ${(e.chosen as unknown[]).length} sources under a ${usdc(String(e.budget))} USDC reading budget`;
    case 'read':
      return e.ok ? (
        <span>
          Reading fee {usdc(String(e.amount))} USDC <span className="chip warn">Authorized</span> <span className="mono">{String(e.transferId).slice(0, 12)}</span>
        </span>
      ) : (
        <span className="chip bad">{String(e.reason)}</span>
      );
    case 'draft':
      return `Model proposed ${String(e.citations)} citations`;
    case 'kernel':
      return (
        <div style={{ display: 'grid', gap: 6 }}>
          {(e.verified as { workId: string; spans: string[] }[]).map((v) => (
            <div key={v.workId}>
              <span className="chip ok">VERIFIED</span> <span className="serif-accent">&ldquo;{v.spans.join(' ... ')}&rdquo;</span>
            </div>
          ))}
          {(e.refused as { reason: string; quote: string }[]).map((r, i) => (
            <div key={i}>
              <span className="chip bad">{r.reason}</span> <s>{r.quote.slice(0, 120)}</s>
            </div>
          ))}
          {(e.owed as { reason: string; sourceUrl: string | null }[]).map((o, i) => (
            <div key={i}>
              <span className="chip warn">OWED</span> {o.reason} {o.sourceUrl}
            </div>
          ))}
        </div>
      );
    case 'strike':
      return (
        <span>
          <span className="chip ok">Struck · final</span> {usdc(String(e.total))} USDC + fee {usdc(String(e.fee))} · <TxLink hash={String(e.txHash)} /> · block {String(e.blockNumber)}
        </span>
      );
    case 'skip-strike':
      return String(e.reason);
    case 'error':
      return <span className="chip bad">{String(e.message)}</span>;
    case 'done':
      return 'Complete';
    default:
      return null;
  }
}

function Clocks({ answerId }: { answerId: string }) {
  const [rows, setRows] = useState<TransferView[]>([]);
  useEffect(() => {
    const load = (): void => {
      fetch(`${AGENT_URL}/transfers?answer=${answerId}`)
        .then((r) => r.json())
        .then((j: TransferView[]) => setRows(j))
        .catch(() => undefined);
    };
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [answerId]);
  if (!rows.length) return null;
  return (
    <section className="card">
      <h2 style={{ fontSize: 22 }}>Reading fees</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Work</th>
            <th>Amount</th>
            <th>Clock</th>
            <th>Batch tx</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="mono">{r.workId.slice(0, 10)}</td>
              <td className="mono">{usdc(r.amount)}</td>
              <td>
                <span className={`chip ${r.state === 'completed' ? 'ok' : r.state === 'failed' ? 'bad' : 'warn'}`}>{clockLabel[r.state]}</span>
              </td>
              <td>{r.settlementTx ? <TxLink hash={r.settlementTx} /> : <span className="mono">pending</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ReaderSetup({ ledger }: { ledger: string }) {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [allowance, setAllowance] = useState('1.00');
  const [perAnswer, setPerAnswer] = useState('0.05');
  const [perDay, setPerDay] = useState('0.50');
  const [msg, setMsg] = useState<string | null>(null);

  const ensure = async (): Promise<void> => {
    if (chainId !== ARC_CHAIN_ID) await switchChainAsync({ chainId: ARC_CHAIN_ID });
  };
  const approve = async (): Promise<void> => {
    try {
      await ensure();
      const amount = parseUsdc6(allowance);
      const hash = await writeContractAsync({ address: ADDRESSES.usdc, abi: erc20Abi, functionName: 'approve', args: [ledger as `0x${string}`, amount] });
      setMsg(`Approval sent: ${hash}`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  const mandate = async (): Promise<void> => {
    try {
      await ensure();
      const hash = await writeContractAsync({
        address: ledger as `0x${string}`,
        abi: ledgerAbi,
        functionName: 'setMandate',
        args: [parseUsdc6(perAnswer), parseUsdc6(perDay)],
      });
      setMsg(`Mandate sent: ${hash}`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  if (!address) return <Notice>Connect a wallet to set a spending mandate, or use the house reader.</Notice>;
  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ fontSize: 22 }}>Your reader mandate</h2>
      <label>
        <span className="kicker">USDC allowance for the ledger</span>
        <input value={allowance} onChange={(e) => setAllowance(e.target.value)} inputMode="decimal" />
      </label>
      <button type="button" className="btn dark" onClick={approve}>
        Approve {allowance} USDC
      </button>
      <div className="grid-2">
        <label>
          <span className="kicker">Cap per answer (USDC)</span>
          <input value={perAnswer} onChange={(e) => setPerAnswer(e.target.value)} inputMode="decimal" />
        </label>
        <label>
          <span className="kicker">Cap per 24h (USDC)</span>
          <input value={perDay} onChange={(e) => setPerDay(e.target.value)} inputMode="decimal" />
        </label>
      </div>
      <button type="button" className="btn violet" onClick={mandate}>
        Set mandate on Arc
      </button>
      <span className="mono" style={{ color: 'var(--muted)' }}>
        Gas is paid in USDC on Arc. Caps are enforced by the ledger contract, not by the agent.
      </span>
      {msg && <span className="mono">{msg}</span>}
    </section>
  );
}

function AskInner() {
  const sp = useSearchParams();
  const { data: cfg, loading } = useAgentConfig();
  const { address } = useAccount();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [mode, setMode] = useState<'house' | 'wallet'>('house');
  const [events, setEvents] = useState<Ev[]>([]);
  const [busy, setBusy] = useState(false);
  const [answerId, setAnswerId] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const ask = useCallback(async () => {
    setEvents([]);
    setAnswer(null);
    setAnswerId(null);
    setBusy(true);
    abort.current = new AbortController();
    try {
      const res = await fetch(`${AGENT_URL}/ask`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q, reader: mode === 'house' ? 'house' : address }),
        signal: abort.current.signal,
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setEvents([{ stage: 'error', message: j.error ?? `request failed (${res.status})` }]);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const p of parts) {
          const line = p.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          const ev = JSON.parse(line.slice(5)) as Ev;
          setEvents((s) => [...s, ev]);
          if (ev.stage === 'draft') setAnswer(String(ev.answer));
          if (ev.stage === 'done') setAnswerId(String(ev.answerId));
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setEvents((s) => [...s, { stage: 'error', message: (e as Error).message }]);
    } finally {
      setBusy(false);
    }
  }, [q, mode, address]);

  if (!AGENT_URL) return <Notice tone="bad">The agent API url is not configured for this build.</Notice>;

  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 920 }}>
      <PageHead title="Ask" kicker="Ask · live on Arc">
        Every source opened is a real nanopayment. Every verified quote is struck on chain. Nothing here is simulated.
      </PageHead>
      {loading ? <Skeleton h={120} /> : !cfg?.ledger && <Notice>The contracts are not deployed to this environment yet.</Notice>}
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <label>
          <span className="kicker">Question</span>
          <textarea rows={3} value={q} onChange={(e) => setQ(e.target.value)} maxLength={400} placeholder="Ask something the registered writers can answer" />
        </label>
        <div role="radiogroup" aria-label="Reader mode" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" role="radio" aria-checked={mode === 'house'} className={`btn small ${mode === 'house' ? 'dark' : 'glass'}`} onClick={() => setMode('house')}>
            House reader (no wallet)
          </button>
          <button type="button" role="radio" aria-checked={mode === 'wallet'} className={`btn small ${mode === 'wallet' ? 'dark' : 'glass'}`} onClick={() => setMode('wallet')}>
            My wallet
          </button>
        </div>
        {mode === 'house' && cfg && (
          <span className="mono" style={{ color: 'var(--muted)' }}>
            House reader {cfg.house.slice(0, 10)}... pays under an on-chain mandate. Reading budget {formatUsdc6(BigInt(cfg.readingBudget))} USDC.
          </span>
        )}
        <button type="button" className="btn violet" disabled={busy || q.trim().length < 5 || !cfg?.ledger || (mode === 'wallet' && !address)} onClick={ask}>
          {busy ? 'Working' : 'Ask and pay the writers'}
        </button>
      </div>
      {mode === 'wallet' && cfg?.ledger && <ReaderSetup ledger={cfg.ledger} />}
      {events.length > 0 && <Stream events={events} />}
      {answer && (
        <section className="card">
          <h2 style={{ fontSize: 22 }}>Answer</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{answer}</p>
          {answerId && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a className="btn glass small" href={`${AGENT_URL}/bundle/${answerId}`} download={`honorar-${answerId.slice(0, 10)}.json`}>
                Download bundle
              </a>
              <Link className="btn dark small" href={`/verify?answer=${answerId}`}>
                Verify this answer
              </Link>
            </div>
          )}
        </section>
      )}
      {answerId && <Clocks answerId={answerId} />}
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<Skeleton h={200} />}>
      <AskInner />
    </Suspense>
  );
}

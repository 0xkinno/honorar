'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { allPass, rpcReader, verifyBundle, type CheckResult } from '@honorar/verifier';
import { canonicalJson, parseBundle, type Hex } from '@honorar/kernel';
import { createArcClient } from '@honorar/chain';
import { Nav } from '@/components/Nav';
import { AGENT_URL } from '@/lib/api';
import { Notice, PageHead, Skeleton } from '@/components/ui';

function VerifyInner() {
  const sp = useSearchParams();
  const [answer, setAnswer] = useState(sp.get('answer') ?? '');
  const [raw, setRaw] = useState('');
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (text: string): Promise<void> => {
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const b = parseBundle(text);
      if (!b.strike) throw new Error('this bundle has no strike record, so there is nothing on chain to check');
      const client = createArcClient(process.env.NEXT_PUBLIC_ARC_RPC_URL);
      const out = await verifyBundle(text, rpcReader(client, b.strike.registry as Hex, b.strike.ledger as Hex));
      setResults(out);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const load = async (): Promise<void> => {
    if (!AGENT_URL) return setError('the agent API url is not configured for this build');
    const res = await fetch(`${AGENT_URL}/bundle/${answer.trim()}`);
    if (!res.ok) return setError('no bundle found for that answer id');
    const text = canonicalJson(await res.json());
    setRaw(text);
    await run(text);
  };

  useEffect(() => {
    if (sp.get('answer') && AGENT_URL) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ok = results ? allPass(results) : null;
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHead title="Verify" kicker="Clean room · no wallet">
        This page re-derives every check in your browser from the bundle and a public Arc RPC. It never asks Honorar, Circle or a model for a verdict on checks V1 to V7.
      </PageHead>
      <section className="card" style={{ display: 'grid', gap: 12 }}>
        <label>
          <span className="kicker">Answer id</span>
          <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="0x" />
        </label>
        <button type="button" className="btn dark" disabled={!answer || busy} onClick={load}>
          Fetch and verify
        </button>
        <label>
          <span className="kicker">Or paste or drop a bundle</span>
          <textarea
            rows={5}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onDrop={async (e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) setRaw(await f.text());
            }}
            onDragOver={(e) => e.preventDefault()}
          />
        </label>
        <button type="button" className="btn glass" disabled={!raw || busy} onClick={() => run(raw)}>
          Verify pasted bundle
        </button>
      </section>
      {error && <Notice tone="bad">{error}</Notice>}
      {busy && <Skeleton h={160} />}
      {results && (
        <section className="card">
          <h2 style={{ fontSize: 24 }}>
            <span className={`chip ${ok ? 'ok' : 'bad'}`}>{ok ? 'VERIFIED' : 'NOT VERIFIED'}</span>
          </h2>
          <table className="table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Result</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b className="mono">{r.id}</b> {r.title} <span className="mono">[{r.invariants.join(', ')}]</span>
                  </td>
                  <td>
                    <span className={`chip ${r.status === 'PASS' ? 'ok' : r.status === 'FAIL' ? 'bad' : 'warn'}`}>{r.status}</span>
                  </td>
                  <td className="mono" style={{ wordBreak: 'break-word' }}>
                    {r.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <>
      <Nav />
      <div className="wrap page-pad">
        <Suspense fallback={<Skeleton h={200} />}>
          <VerifyInner />
        </Suspense>
      </div>
    </>
  );
}

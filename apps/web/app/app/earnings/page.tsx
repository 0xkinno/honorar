'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { AGENT_URL, clockLabel, getJson, type TransferView } from '@/lib/api';
import { useFetch } from '@/lib/hooks';
import { Notice, PageHead, Skeleton, TxLink, usdc } from '@/components/ui';

type Quote = { workId: string; spanHash: string; amount: bigint; answerId: string; txHash: string; block: bigint };


export default function EarningsPage() {
  const { address } = useAccount();
  const { data: transfers, loading } = useFetch<TransferView[]>(address ? `/transfers?writer=${address}` : null, 10000);
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    let live = true;
    getJson<{ answerId: string; workId: string; spanHash: string; amount: string; txHash: string; block: number }[]>(`/quotes?writer=${address}`)
      .then((rows) => live && setQuotes(rows.map((r) => ({ workId: r.workId, spanHash: r.spanHash, amount: BigInt(r.amount), answerId: r.answerId, txHash: r.txHash, block: BigInt(r.block) }))))
      .catch((e: unknown) => live && setErr((e as Error).message));
    return () => {
      live = false;
    };
  }, [address]);

  if (!AGENT_URL) return (<><PageHead title="Earnings" kicker="Writers" /><Notice tone="warn">The live agent service is not connected to this deployment yet. Contracts are on Arc mainnet; the app lights up when the agent API url is set.</Notice></>);
  if (!address) return (<><PageHead title="Earnings" kicker="Writers" /><Notice>Connect the wallet you registered works with.</Notice></>);

  const total = (quotes ?? []).reduce((a, q) => a + q.amount, 0n);
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHead title="Earnings" kicker="Writers">
        Every honorarium names its answer and its transaction. Reading fees show their clock until Arc settles them.
      </PageHead>
      {err && <Notice tone="bad">{err}</Notice>}
      <section className="card">
        <span className="kicker">Struck honoraria</span>
        <div style={{ fontSize: 44, fontWeight: 200 }}>{quotes ? `${usdc(total)} USDC` : <Skeleton h={44} w={200} />}</div>
        {quotes && quotes.length === 0 && <p>No quote of your works has been struck yet.</p>}
        {quotes && quotes.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Answer</th>
                <th>Span hash</th>
                <th>Amount</th>
                <th>Transaction</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={`${q.txHash}-${q.workId}`}>
                  <td className="mono">{q.answerId.slice(0, 12)}</td>
                  <td className="mono">{q.spanHash.slice(0, 12)}</td>
                  <td className="mono">{usdc(q.amount)}</td>
                  <td>
                    <TxLink hash={q.txHash} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="card">
        <span className="kicker">Reading fees</span>
        {loading ? (
          <Skeleton h={80} />
        ) : transfers && transfers.length > 0 ? (
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
              {transfers.map((t) => (
                <tr key={t.id}>
                  <td className="mono">{t.workId.slice(0, 10)}</td>
                  <td className="mono">{usdc(t.amount)}</td>
                  <td>
                    <span className={`chip ${t.state === 'completed' ? 'ok' : t.state === 'failed' ? 'bad' : 'warn'}`}>{clockLabel[t.state]}</span>
                  </td>
                  <td>{t.settlementTx ? <TxLink hash={t.settlementTx} /> : <span className="mono">pending</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No reading fees yet.</p>
        )}
      </section>
    </div>
  );
}

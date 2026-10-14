'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { parseAbiItem } from 'viem';
import { AGENT_URL, clockLabel, type TransferView } from '@/lib/api';
import { arcClient, useAgentConfig, useFetch } from '@/lib/hooks';
import { Notice, PageHead, Skeleton, TxLink, usdc } from '@/components/ui';

type Quote = { workId: string; spanHash: string; amount: bigint; answerId: string; txHash: string; block: bigint };

const registered = parseAbiItem('event WorkRegistered(bytes32 indexed workId, bytes32 contentHash, address indexed registrant, string uri)');
const quoteStruck = parseAbiItem('event QuoteStruck(bytes32 indexed answerId, bytes32 indexed workId, bytes32 spanHash, uint64 amount)');

export default function EarningsPage() {
  const { address } = useAccount();
  const { data: cfg } = useAgentConfig();
  const { data: transfers, loading } = useFetch<TransferView[]>(address ? `/transfers?writer=${address}` : null, 10000);
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !cfg?.registry || !cfg.ledger) return;
    let live = true;
    (async () => {
      const c = arcClient();
      const latest = await c.getBlockNumber();
      const from = BigInt(cfg.deployBlock ?? 0);
      const STEP = 90_000n;
      const ranges: [bigint, bigint][] = [];
      for (let lo = from; lo <= latest; lo += STEP) ranges.push([lo, lo + STEP - 1n > latest ? latest : lo + STEP - 1n]);
      const ids: `0x${string}`[] = [];
      for (const [lo, hi] of ranges) {
        const works = await c.getLogs({ address: cfg.registry as `0x${string}`, event: registered, args: { registrant: address }, fromBlock: lo, toBlock: hi });
        ids.push(...works.map((w) => w.args.workId as `0x${string}`));
      }
      if (ids.length === 0) return live && setQuotes([]);
      const logs = [];
      for (const [lo, hi] of ranges) {
        logs.push(...(await c.getLogs({ address: cfg.ledger as `0x${string}`, event: quoteStruck, args: { workId: ids }, fromBlock: lo, toBlock: hi })));
      }
      if (!live) return;
      setQuotes(
        logs.map((l) => ({
          workId: l.args.workId as string,
          spanHash: l.args.spanHash as string,
          amount: l.args.amount as bigint,
          answerId: l.args.answerId as string,
          txHash: l.transactionHash,
          block: l.blockNumber,
        })),
      );
    })().catch((e: unknown) => live && setErr((e as Error).message));
    return () => {
      live = false;
    };
  }, [address, cfg]);

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

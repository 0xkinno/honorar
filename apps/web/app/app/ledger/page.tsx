'use client';

import Link from 'next/link';
import { AGENT_URL, clockLabel, type AnswerRow, type ReconView, type TransferView } from '@/lib/api';
import { useFetch } from '@/lib/hooks';
import { Notice, PageHead, Skeleton, TxLink, usdc } from '@/components/ui';

export default function LedgerPage() {
  const answers = useFetch<AnswerRow[]>('/answers', 15000);
  const transfers = useFetch<TransferView[]>('/transfers', 15000);
  const recon = useFetch<ReconView[]>('/reconciliations', 15000);
  if (!AGENT_URL) return (<><PageHead title="Ledger" kicker="Public · no wallet" /><Notice tone="warn">The live agent service is not connected to this deployment yet. Contracts are on Arc mainnet; the app lights up when the agent API url is set.</Notice></>);
  const mismatches = (recon.data ?? []).filter((r) => r.verdict === 'MISMATCH');
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHead title="Ledger" kicker="Public · no wallet">
        Every answer struck and every reading fee, with the batch reconciliation that ties Gateway credits back to Arc.
      </PageHead>
      {mismatches.length > 0 && <Notice tone="bad">{mismatches.length} batch reconciliation(s) report a mismatch. Nothing is auto-corrected.</Notice>}
      <section className="card">
        <h2 style={{ fontSize: 22 }}>Answers</h2>
        {answers.loading ? (
          <Skeleton h={80} />
        ) : (answers.data ?? []).length === 0 ? (
          <p>No answers yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Status</th>
                <th>When</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(answers.data ?? []).map((a) => (
                <tr key={a.answerId}>
                  <td>{a.question}</td>
                  <td>
                    <span className={`chip ${a.struck ? 'ok' : ''}`}>{a.struck ? 'Struck' : 'No payable quote'}</span>
                  </td>
                  <td className="mono">{new Date(a.createdAt).toLocaleString()}</td>
                  <td>
                    <Link href={`/verify?answer=${a.answerId}`}>Verify</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="card">
        <h2 style={{ fontSize: 22 }}>Reading fees</h2>
        {(transfers.data ?? []).length === 0 ? (
          <p>No reading fees yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Transfer</th>
                <th>Amount</th>
                <th>Clock</th>
                <th>Batch tx</th>
              </tr>
            </thead>
            <tbody>
              {(transfers.data ?? []).map((t) => (
                <tr key={t.id}>
                  <td className="mono">{t.id.slice(0, 12)}</td>
                  <td className="mono">{usdc(t.amount)}</td>
                  <td>
                    <span className={`chip ${t.state === 'completed' ? 'ok' : t.state === 'failed' ? 'bad' : 'warn'}`}>{clockLabel[t.state]}</span>
                  </td>
                  <td>{t.settlementTx ? <TxLink hash={t.settlementTx} /> : <span className="mono">pending</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="card">
        <h2 style={{ fontSize: 22 }}>Batch reconciliation</h2>
        {(recon.data ?? []).length === 0 ? (
          <p>No batch has been reconciled yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Batch tx</th>
                <th>Writer</th>
                <th>Honorar sum</th>
                <th>Observed credit</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {(recon.data ?? []).map((r) => (
                <tr key={`${r.txHash}-${r.writer}`}>
                  <td>
                    <TxLink hash={r.txHash} />
                  </td>
                  <td className="mono">{r.writer.slice(0, 10)}</td>
                  <td className="mono">{usdc(r.honorarSum)}</td>
                  <td className="mono">{r.observedCredit ? usdc(r.observedCredit) : 'unknown'}</td>
                  <td>
                    <span className={`chip ${r.verdict === 'MISMATCH' ? 'bad' : r.verdict === 'MATCH' ? 'ok' : 'warn'}`}>{r.verdict}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

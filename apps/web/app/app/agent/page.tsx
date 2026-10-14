'use client';

import { addressUrl } from '@honorar/chain';
import { ADDRESSES } from '@honorar/chain';
import Link from 'next/link';
import { useAgentConfig } from '@/lib/hooks';
import { Notice, PageHead, Skeleton, TxLink } from '@/components/ui';
import feedback from '@/content/feedback.json';
import { useFetch } from '@/lib/hooks';

type Fb = { answerId: string; score: number; tx: string; tag?: string };

export default function AgentPage() {
  const { data: cfg, loading, error } = useAgentConfig();
  const agentId = process.env.NEXT_PUBLIC_ERC8004_AGENT_ID;
  const live = useFetch<Fb[]>('/feedback', 30000);
  const rows: Fb[] = [...(live.data ?? []), ...(feedback.feedback as Fb[])].filter((r, i, a) => a.findIndex((x) => x.answerId === r.answerId) === i);
  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 820 }}>
      <PageHead title="Agent" kicker="ERC-8004 identity">
        The Honorar agent is registered in the Arc mainnet IdentityRegistry. A separate validator wallet records one feedback score per answer, computed from the kernel outcome.
      </PageHead>
      {error && <Notice tone="bad">{error}</Notice>}
      {loading ? (
        <Skeleton h={160} />
      ) : (
        <section className="card" style={{ display: 'grid', gap: 10 }}>
          <div>
            <span className="kicker">Agent id</span>
            <div className="mono">{agentId ?? 'not registered yet'}</div>
          </div>
          <div>
            <span className="kicker">Operator wallet</span>
            <div>{cfg ? <Link className="mono" href={addressUrl(cfg.agent)}>{cfg.agent}</Link> : '...'}</div>
          </div>
          <div>
            <span className="kicker">Identity registry</span>
            <div><Link className="mono" href={addressUrl(ADDRESSES.identityRegistry)}>{ADDRESSES.identityRegistry}</Link></div>
          </div>
          <div>
            <span className="kicker">Reputation registry</span>
            <div><Link className="mono" href={addressUrl(ADDRESSES.reputationRegistry)}>{ADDRESSES.reputationRegistry}</Link></div>
          </div>
          <div>
            <span className="kicker">Ledger</span>
            <div>{cfg?.ledger ? <Link className="mono" href={addressUrl(cfg.ledger)}>{cfg.ledger}</Link> : 'not deployed'}</div>
          </div>
          <div>
            <span className="kicker">Reputation feedback, one per answer</span>
            <table className="table">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.answerId}>
                    <td className="mono">{r.answerId.slice(0, 12)}</td>
                    <td><span className={`chip ${r.score > 0 ? 'ok' : 'bad'}`}>{r.tag ?? 'answer'}</span></td>
                    <td className="mono">score {r.score}</td>
                    <td><TxLink hash={r.tx} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

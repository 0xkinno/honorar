'use client';

import { addressUrl } from '@honorar/chain';
import { ADDRESSES } from '@honorar/chain';
import Link from 'next/link';
import { useAgentConfig } from '@/lib/hooks';
import { Notice, PageHead, Skeleton } from '@/components/ui';

export default function AgentPage() {
  const { data: cfg, loading, error } = useAgentConfig();
  const agentId = process.env.NEXT_PUBLIC_ERC8004_AGENT_ID;
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
        </section>
      )}
    </div>
  );
}

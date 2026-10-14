'use client';

import { useState } from 'react';
import { keccak256, encodeAbiParameters } from 'viem';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import { ARC_CHAIN_ID, honorarRegistryAbi, parseUsdc6 } from '@honorar/chain';
import { AGENT_URL } from '@/lib/api';
import { ensureArc, walletError } from '@/lib/wallet';
import { arcClient, useAgentConfig } from '@/lib/hooks';
import { Notice, PageHead, TxLink } from '@/components/ui';

type Preview = { id: string; title: string; contentHash: string; url: string; text: string };
type Split = { address: string; pct: string };

export default function LibraryPage() {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { data: cfg } = useAgentConfig();
  const [url, setUrl] = useState('');
  const [paste, setPaste] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [readPrice, setReadPrice] = useState('0.001');
  const [quotePrice, setQuotePrice] = useState('0.004');
  const [splits, setSplits] = useState<Split[]>([{ address: '', pct: '100' }]);
  const [status, setStatus] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = async (): Promise<void> => {
    setError(null);
    setPreview(null);
    const res = await fetch(`${AGENT_URL}/corpus/preview`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(paste ? { text: paste, url: url || 'pasted:text' } : { url }),
    });
    const j = (await res.json()) as Preview & { error?: string };
    if (!res.ok) setError(j.error ?? 'could not fetch');
    else setPreview(j);
  };

  const register = async (): Promise<void> => {
    if (!preview || !cfg?.registry || !address) return;
    setError(null);
    try {
      await ensureArc(chainId, switchChainAsync);
      const recipients = splits.map((s, i) => (i === 0 && !s.address ? address : s.address) as `0x${string}`);
      if (recipients[0]?.toLowerCase() !== address.toLowerCase()) throw new Error('the first recipient must be the connected wallet');
      const bps = splits.map((s) => Math.round(Number(s.pct) * 100));
      const workId = keccak256(encodeAbiParameters([{ type: 'bytes32' }, { type: 'address' }], [preview.contentHash as `0x${string}`, address]));
      const args = [workId, preview.contentHash as `0x${string}`, preview.url, recipients, bps, parseUsdc6(readPrice), parseUsdc6(quotePrice)] as const;
      setStatus('Simulating');
      await arcClient().simulateContract({ address: cfg.registry as `0x${string}`, abi: honorarRegistryAbi, functionName: 'registerWork', args, account: address });
      setStatus('Waiting for your signature');
      const hash = await writeContractAsync({ address: cfg.registry as `0x${string}`, abi: honorarRegistryAbi, functionName: 'registerWork', args });
      setTx(hash);
      setStatus('Waiting for the block');
      await arcClient().waitForTransactionReceipt({ hash });
      await fetch(`${AGENT_URL}/corpus/bind`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: preview.id, workId }) });
      setStatus('Registered');
    } catch (e) {
      setError(walletError(e));
      setStatus(null);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 820 }}>
      <PageHead title="Library" kicker="Writers">
        Register an article once. The hash of its normalized text and your two prices are committed on Arc. You keep 100% of your price; the 2.5% protocol fee is added on top for the reader.
      </PageHead>
      {!cfg?.registry && <Notice>The registry is not deployed to this environment yet.</Notice>}
      <section className="card" style={{ display: 'grid', gap: 12 }}>
        <label>
          <span className="kicker">Article URL</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </label>
        <label>
          <span className="kicker">Or paste the text</span>
          <textarea rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} />
        </label>
        <button type="button" className="btn dark" disabled={!url && !paste} onClick={fetchPreview}>
          Fetch and hash
        </button>
        {error && <Notice tone="bad">{error}</Notice>}
      </section>
      {preview && (
        <section className="card" style={{ display: 'grid', gap: 12 }}>
          <h2 style={{ fontSize: 22 }}>{preview.title}</h2>
          <span className="mono" style={{ wordBreak: 'break-all' }}>
            contentHash {preview.contentHash}
          </span>
          <div className="grid-2">
            <label>
              <span className="kicker">Reading fee per open (USDC)</span>
              <input value={readPrice} onChange={(e) => setReadPrice(e.target.value)} inputMode="decimal" />
            </label>
            <label>
              <span className="kicker">Honorarium per quote (USDC)</span>
              <input value={quotePrice} onChange={(e) => setQuotePrice(e.target.value)} inputMode="decimal" />
            </label>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <span className="kicker">Recipients (percent, must total 100)</span>
            {splits.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8 }}>
                <input aria-label={`Recipient ${i + 1}`} value={i === 0 && !s.address && address ? address : s.address} onChange={(e) => setSplits(splits.map((x, j) => (j === i ? { ...x, address: e.target.value } : x)))} placeholder="0x" />
                <input aria-label={`Percent ${i + 1}`} value={s.pct} onChange={(e) => setSplits(splits.map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)))} inputMode="decimal" />
              </div>
            ))}
            <button type="button" className="btn glass small" onClick={() => setSplits([...splits, { address: '', pct: '0' }])}>
              Add co-author
            </button>
          </div>
          <button
            type="button"
            className="btn violet"
            disabled={!address || !cfg?.registry}
            onClick={() => {
              if (splits[0] && !splits[0].address && address) setSplits(splits.map((x, j) => (j === 0 ? { ...x, address } : x)));
              void register();
            }}
          >
            Register on Arc
          </button>
          {!address && <span className="mono">Connect a wallet to sign.</span>}
          {status && <span className="chip">{status}</span>}
          {tx && <TxLink hash={tx} />}
        </section>
      )}
    </div>
  );
}

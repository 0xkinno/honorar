import Link from 'next/link';
import { addressUrl, txUrl } from '@honorar/chain';
import { Nav } from '@/components/Nav';
import { benchmark, breakResults, deployment, discoveryE1, testCounts } from '@/lib/evidence';

export const metadata = { title: 'Proof' };

const INVARIANTS: [string, string, string][] = [
  ['I1', 'SPAN', 'Every paid span is an exact substring of a source whose hash is registered on chain'],
  ['I2', 'USE', 'Every paid span appears quoted in the final answer'],
  ['I3', 'COMPLETE', 'Every verified quote is paid or recorded as OWED with a reason'],
  ['I4', 'ONCE', 'An (answer, work) pair is struck at most once'],
  ['I5', 'MANDATE', 'Strikes stay within the reader on-chain caps'],
  ['I6', 'VERSION', 'A strike reverts if the work changed after pricing'],
  ['I7', 'ROOT', 'The on-chain root equals the recomputed Merkle root'],
  ['I8', 'FRONTED', 'Fronted reading fees equal the committed Gateway transfers'],
  ['I9', 'NETTING', 'Transfers to a writer in a batch do not exceed the observed credit'],
  ['I10', 'NO-MODEL-MONEY', 'No model output is typed as an amount, address or price'],
  ['I11', 'NO-RETRY-AFTER-SIGN', 'A signed payment is never retried'],
  ['I12', 'CLEAN-ROOM', 'The verifier needs only the bundle and a public Arc RPC'],
];

export default function ProofPage() {
  const dep = deployment();
  const breaks = breakResults();
  const bench = benchmark();
  const e1 = discoveryE1();
  const tests = testCounts();
  return (
    <>
      <Nav />
      <main className="wrap page-pad" style={{ display: 'grid', gap: 24 }}>
        <header>
          <p className="kicker">Proof</p>
          <h1 className="h2" style={{ margin: '8px 0' }}>
            Every claim, <span className="serif-accent">with its file.</span>
          </h1>
          <p style={{ color: 'var(--ink-2)', maxWidth: 720 }}>Numbers on this page are read from generated evidence files and the chain. Anything not measured yet says so.</p>
        </header>

        <section className="card" id="contracts">
          <h2 style={{ fontSize: 24 }}>Contracts on Arc mainnet</h2>
          {dep ? (
            <table className="table">
              <tbody>
                <tr>
                  <td>HonorarRegistry</td>
                  <td><Link className="mono" href={addressUrl(dep.registry)}>{dep.registry}</Link></td>
                  <td><Link className="mono" href={txUrl(dep.registryTx)}>deploy tx</Link></td>
                </tr>
                <tr>
                  <td>HonorarLedger</td>
                  <td><Link className="mono" href={addressUrl(dep.ledger)}>{dep.ledger}</Link></td>
                  <td><Link className="mono" href={txUrl(dep.ledgerTx)}>deploy tx</Link></td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p><span className="chip warn">pending</span> Deployment record not present yet.</p>
          )}
        </section>

        <section className="card" id="invariants">
          <h2 style={{ fontSize: 24 }}>Twelve invariants</h2>
          <table className="table">
            <tbody>
              {INVARIANTS.map(([id, name, rule]) => (
                <tr key={id}>
                  <td className="mono">{id}</td>
                  <td><b>{name}</b></td>
                  <td>{rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mono">Full table with tests and verifier checks: INVARIANTS.md</p>
        </section>

        <section className="card" id="break">
          <h2 style={{ fontSize: 24 }}>Break campaign</h2>
          {breaks.length === 0 ? (
            <p><span className="chip warn">pending</span> Run pnpm break to generate evidence/break.</p>
          ) : (
            <table className="table">
              <thead><tr><th>ID</th><th>Attack</th><th>Expected</th><th>Observed</th><th>Verdict</th></tr></thead>
              <tbody>
                {breaks.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.id}</td>
                    <td>{r.attack}</td>
                    <td>{r.expected}</td>
                    <td className="mono">{r.observed}</td>
                    <td><span className={`chip ${r.verdict === 'FAILED' ? 'bad' : 'ok'}`}>{r.verdict}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card" id="tests">
          <h2 style={{ fontSize: 24 }}>Tests</h2>
          {tests ? (
            <p className="mono">Foundry {tests.forge} · kernel {tests.kernel} · verifier {tests.verifier} · agent {tests.agent}</p>
          ) : (
            <p><span className="chip warn">pending</span> Run pnpm evidence:tests.</p>
          )}
        </section>

        <section className="card" id="benchmark">
          <h2 style={{ fontSize: 24 }}>Benchmark</h2>
          {bench ? (
            <table className="table">
              <thead><tr><th>Policy</th><th>Misdirected %</th><th>Unpaid use</th><th>Fabricated paid</th></tr></thead>
              <tbody>
                {Object.entries(bench.arms).map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td className="mono">{v.misdirectedPct}</td><td className="mono">{v.unpaidUse}</td><td className="mono">{v.fabricatedPaid}</td></tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p><span className="chip warn">pending</span> Benchmark results are generated after mainnet answers exist.</p>
          )}
        </section>

        <section className="card" id="discovery">
          <h2 style={{ fontSize: 24 }}>Discovery</h2>
          {e1 ? (
            <p className="mono">E1: {e1.summary.n} payments, {e1.summary.completedPct}% completed. See DISCOVERY.md.</p>
          ) : (
            <p><span className="chip warn">pending</span> Experiments E1 to E7 run on mainnet after funding.</p>
          )}
        </section>
      </main>
    </>
  );
}

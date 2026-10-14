import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const j = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const x = 'https://explorer.arc.io/tx/';
const usdc = (b) => (Number(b) / 1e6).toFixed(6);
const t = j('evidence/tests.json');
const sections = {};

sections.stats = [
  '| Suite | Passing |',
  '|---|---|',
  `| Foundry (unit, fuzz, invariant, golden vectors) | ${t.forge} |`,
  `| Attribution kernel (unit, property, shared vectors) | ${t.kernel} |`,
  `| Offline verifier (clean and tampered bundles) | ${t.verifier} |`,
  `| Agent service (retrieval, planning, reconciler) | ${t.agent} |`,
].join('\n');

const breaks = readdirSync('evidence/break')
  .filter((f) => f.endsWith('.json') && f !== 'summary.json')
  .map((f) => j(`evidence/break/${f}`))
  .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
sections.break = [
  '| ID | Attack | Expected | Observed | Verdict |',
  '|---|---|---|---|---|',
  ...breaks.map((r) => `| ${r.id} | ${r.attack} | ${r.expected} | ${r.observed.replace(/\|/g, '/')} | ${r.verdict.toLowerCase()} |`),
].join('\n');

const dir = 'evidence/mainnet';
const bundles = readdirSync(dir)
  .filter((n) => /^0x[0-9a-f]{10}\.json$/.test(n) || n === 'answer-1.json')
  .map((n) => j(`${dir}/${n}`))
  .filter((b) => b && b.strike);
const reads = bundles.reduce((a, b) => a + b.transferIds.length, 0);
const paid = bundles.reduce((a, b) => a + b.leaves.reduce((s, l) => s + BigInt(l.amount), 0n), 0n);
const mainnet = [
  `**${bundles.length} answers struck on Arc mainnet**, ${reads} reading fees through Gateway in those answers, ${usdc(paid)} USDC of honoraria to the writer.`,
  '',
  '| Answer | Quoted sentence | Strike tx | Block |',
  '|---|---|---|---|',
];
for (const b of bundles) {
  const span = b.leaves[0]?.spans[0] ?? '';
  mainnet.push(`| \`${b.answerId.slice(0, 10)}\` | "${span.length > 70 ? `${span.slice(0, 67)}...` : span}" | [${b.strike.txHash.slice(0, 10)}...](${x}${b.strike.txHash}) | ${b.strike.blockNumber} |`);
}
const e = j(`${dir}/erc8004.json`);
const fb = j(`${dir}/feedback.json`);
if (e) mainnet.push('', `ERC-8004 agent id **${e.agentId}** ([registration](${x}${e.txHash}))${fb ? `, ${fb.feedback.length} validator feedback entries recorded` : ''}.`);
sections.mainnet = mainnet.join('\n');

const e1 = j('evidence/discovery/E1.json');
const e2 = j('evidence/discovery/E2.json');
const e3 = j('evidence/discovery/E3.json');
const e5 = j('evidence/discovery/E5.json');
const e6 = j('evidence/discovery/E6.json');
const b8 = j('evidence/discovery/E4-b8.json');
const disc = [];
if (e1) {
  disc.push(
    `- **Reading fees are slow to settle and vary widely.** ${e1.summary.n} nanopayments of 0.001 USDC: ${e1.summary.completedPct}% reached \`completed\`; authorization to settled took p50 **${e1.latencySeconds.p50}s**, p95 ${e1.latencySeconds.p95}s, from ${e1.latencySeconds.min}s to ${e1.latencySeconds.max}s. A UI that says "settled" when \`pay()\` returns is wrong by minutes.`,
  );
}
if (e2 && e1) {
  disc.push(
    `- **A batch hides the individual payments.** ${e1.summary.n} transfers settled in ${e2.batches.length} transactions with one log each: ${e2.batches.map((b) => `[${b.txHash.slice(0, 10)}...](${x}${b.txHash}) carried ${b.honorarTransfersInBatch}`).join(' and ')} of ours. No transfer id appears on chain.`,
  );
}
if (e1) disc.push(`- **The settlement hash is an untyped field.** The SDK type has an index signature; the batch hash arrives as \`${e1.settlementField}\`.`);
if (e3) {
  disc.push(
    `- **Funds leave the available balance at authorization.** Deposit ${usdc(e3.depositedBaseUnits)} USDC, ${e3.transfersFromAgent} transfers of 0.001, available balance ${usdc(e3.observedGateway.available)} as expected.`,
  );
}
if (b8) {
  disc.push(
    `- **A signed payment must never be retried.** When the seller drops the socket after settling, \`pay()\` throws but the payment exists: ${b8.transfersFoundBySearch.length} transfer found by \`searchTransfers\`, ${b8.signedRequestsReceivedBySeller} signed request sent. Verdict: ${b8.verdict.toLowerCase()}.`,
  );
}
if (e5) disc.push(`- **Writer credit reconciles.** Writer Gateway total ${usdc(e5.writerGatewayTotal)} USDC equals completed transfers to that writer (${e5.verdict}).`);
if (e6 && e6.strikes[0]) {
  disc.push(`- **A strike is cheap.** ${e6.strikes[0].gasUsed} gas, **${e6.strikes[0].usdc} USDC** for a one-leaf honorarium (${e6.strikes.length} strikes measured).`);
}
sections.discovery = disc.join('\n');

const bench = j('evidence/benchmark.json');
if (bench) {
  const arms = [
    ['payPerRead', 'Pay per read'],
    ['modelAttribution', 'Model attribution'],
    ['randomControl', 'Random control'],
    ['honorar', 'Honorar'],
  ];
  const head = ['| Policy | Misdirected USDC | Unpaid use | Fabricated citations paid | Paid to the injected source |', '|---|---|---|---|---|'];
  const row = (m, label) => `| ${label} | ${m.misdirectedPct}% | ${m.unpaidUse} | ${m.fabricatedPaid} | ${m.stuffedPaid} |`;
  const lines = [
    `${bench.questions} questions, ${bench.corpus.length} sources (one carries an injected instruction), two models (${bench.modelIds.map((m) => `\`${m}\``).join(', ')}). Same answers, only the payout policy changes. Metrics are deterministic, no model judge.`,
    '',
    '**Main model**',
    '',
    ...head,
    ...arms.map(([k, l]) => row(bench.arms[k], l)),
    '',
    '**Second model**',
    '',
    ...head,
    ...arms.map(([k, l]) => row(bench.secondModelArms[k], l)),
  ];
  sections.bench = lines.join('\n');
} else {
  sections.bench = 'Benchmark not generated yet. See [docs/BENCHMARK.md](docs/BENCHMARK.md).';
}

let s = readFileSync('README.md', 'utf8');
for (const [k, v] of Object.entries(sections)) {
  s = s.replace(new RegExp(`<!-- ${k}:start -->[\\s\\S]*?<!-- ${k}:end -->`), () => `<!-- ${k}:start -->\n${v}\n<!-- ${k}:end -->`);
}
const ok = breaks.filter((r) => r.verdict !== 'FAILED').length;
s = s.replace(/foundry-\d+%20passing/, `foundry-${t.forge}%20passing`).replace(/kernel-\d+%20passing/, `kernel-${t.kernel}%20passing`);
s = s.replace(/break%20campaign-[0-9]+%2F[0-9]+[^)]*-/, `break%20campaign-${ok}%2F${breaks.length}%20passing-`);
writeFileSync('README.md', s);
process.stdout.write('readme synced\n');

if (bench) {
  writeFileSync(
    'docs/BENCHMARK.md',
    `# BENCHMARK\n\nGenerated by \`scripts/readme-sync.mjs\` from \`evidence/benchmark.json\`. Questions were committed in \`bench/questions.json\` before any result existed. Errors: ${bench.errors}. Run commit: \`${bench.commit}\`.\n\nArms over identical answers: pay-per-read (every opened source), model attribution (every source the model cited, verified or not), random control (same count as Honorar, seeded), Honorar (kernel-verified quotes only).\n\n${sections.bench}\n\nLimits: a small corpus of ${bench.corpus.length} sources, retrieval over the top 3, payments are hypothetical per policy (the on-chain flow is evidenced separately in EVIDENCE.md).\n`,
  );
}

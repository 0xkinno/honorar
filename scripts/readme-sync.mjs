import { readFileSync, writeFileSync } from 'node:fs';

const t = JSON.parse(readFileSync('evidence/tests.json', 'utf8'));
const block = [
  '<!-- stats:start -->',
  '| Suite | Passing |',
  '|---|---|',
  `| Foundry (unit, fuzz, invariant, golden vectors) | ${t.forge} |`,
  `| Attribution kernel (unit, property, shared vectors) | ${t.kernel} |`,
  `| Offline verifier (clean and tampered bundles) | ${t.verifier} |`,
  `| Agent service (retrieval, planning, reconciler) | ${t.agent} |`,
  '<!-- stats:end -->',
].join('\n');
let s = readFileSync('README.md', 'utf8');
s = s.replace(/<!-- stats:start -->[\s\S]*?<!-- stats:end -->/, block);
s = s.replace(/foundry-\d+%20passing/, `foundry-${t.forge}%20passing`).replace(/kernel-\d+%20passing/, `kernel-${t.kernel}%20passing`);
writeFileSync('README.md', s);
process.stdout.write('readme synced\n');

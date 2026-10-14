import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const denyPath = 'reference/.denylist';
if (!existsSync(denyPath)) {
  process.stderr.write('check-clean: reference/.denylist missing\n');
  process.exit(1);
}
const terms = readFileSync(denyPath, 'utf8').split(/\r?\n/).map((t) => t.trim()).filter(Boolean);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = terms.map((t) => new RegExp(`(?<![A-Za-z0-9])${esc(t)}(?![A-Za-z0-9])`, 'i'));
const files = execSync('git ls-files', { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
const dash = new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']');
const hits = [];
for (const f of files) {
  if (/\.(png|jpe?g|avif|webp|ico|woff2?|pdf|zip)$/i.test(f)) continue;
  let text;
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    patterns.forEach((p, k) => { if (p.test(line)) hits.push(`${f}:${i + 1} term "${terms[k]}"`); });
    if (dash.test(line)) hits.push(`${f}:${i + 1} em/en dash`);
  });
}
if (hits.length) {
  process.stderr.write(`check-clean FAILED\n${hits.join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(`check-clean ok (${files.length} files)\n`);

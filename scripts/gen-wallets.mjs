import { existsSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const file = '.env.local';
const roles = ['DEPLOYER', 'AGENT', 'HOUSE_READER', 'VALIDATOR', 'WRITER_TEST'];
const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
if (!current) writeFileSync(file, '# Honorar local secrets. Gitignored. Never commit.\n');
const out = [];
for (const role of roles) {
  if (current.includes(`${role}_PRIVATE_KEY=`)) {
    const m = current.match(new RegExp(`${role}_ADDRESS=(0x[0-9a-fA-F]{40})`));
    out.push([role, m ? m[1] : 'existing']);
    continue;
  }
  const pk = generatePrivateKey();
  const addr = privateKeyToAccount(pk).address;
  appendFileSync(file, `${role}_PRIVATE_KEY=${pk}\n${role}_ADDRESS=${addr}\n`);
  out.push([role, addr]);
}
for (const [r, a] of out) process.stdout.write(`${r.padEnd(14)} ${a}\n`);

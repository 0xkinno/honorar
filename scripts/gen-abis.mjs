import { readFileSync, writeFileSync } from 'node:fs';

const out = [];
for (const name of ['HonorarRegistry', 'HonorarLedger']) {
  const j = JSON.parse(readFileSync(`contracts/out/${name}.sol/${name}.json`, 'utf8'));
  out.push(`export const ${name[0].toLowerCase()}${name.slice(1)}Abi = ${JSON.stringify(j.abi, null, 2)} as const;\n`);
}
writeFileSync('packages/chain/src/abis.ts', out.join('\n'));
process.stdout.write('abis written\n');

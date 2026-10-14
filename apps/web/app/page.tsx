import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Nav } from '@/components/Nav';
import { Audience, Close, Decides, Follow, Hero, HowItPays, Problem, ProofStrip, TwoClocks, type ProofTile } from '@/components/landing/Sections';
import { benchmark, breakResults, deployment, discoveryE1, featured, testCounts } from '@/lib/evidence';

function questions(): string[] {
  try {
    const raw = readFileSync(join(process.cwd(), '..', '..', 'bench', 'questions.json'), 'utf8');
    return (JSON.parse(raw) as { questions: { text: string }[] }).questions.map((q) => q.text);
  } catch {
    return [];
  }
}

export default function Home() {
  const f = featured();
  const b = benchmark();
  const e1 = discoveryE1();
  const breaks = breakResults();
  const tests = testCounts();
  const dep = deployment();
  const passed = breaks.filter((r) => r.verdict !== 'FAILED').length;
  const median = e1?.summary.p50Seconds.completed ?? null;

  const tiles: ProofTile[] = [
    { label: 'Break campaign passed', value: breaks.length ? passed : null, href: '/proof#break', suffix: `/${breaks.length}` },
    { label: 'Named invariants', value: 12, href: '/proof#invariants' },
    { label: 'Tests passing', value: tests ? tests.forge + tests.kernel + tests.verifier + tests.agent : null, href: '/proof#tests' },
    { label: 'Contracts verified', value: dep ? 2 : null, href: '/proof#contracts' },
    { label: 'Benchmark questions', value: b?.questions ?? null, href: '/proof#benchmark' },
    { label: 'Discovery experiments', value: e1 ? 1 : null, href: '/proof#discovery' },
  ];

  return (
    <>
      <Nav />
      <main>
        <Hero questions={questions()} featured={f} />
        <Follow f={f} />
        <Problem
          bench={b ? { misdirectedPct: Object.fromEntries(Object.entries(b.arms).map(([k, v]) => [k, v.misdirectedPct])), questions: b.questions } : null}
          e1={{ p50: median, completedPct: e1?.summary.completedPct ?? null }}
        />
        <HowItPays />
        <TwoClocks medianSeconds={median} />
        <Decides />
        <ProofStrip tiles={tiles} />
        <Audience />
        <Close />
      </main>
    </>
  );
}

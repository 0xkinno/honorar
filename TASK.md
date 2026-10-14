# TASK

Mark `[x]` only when verified. Phases end with a gate.

## P0 Setup
- [x] Repo initialised, authored as 0xkinno only, commit-msg hook blocks trailers
- [x] gitleaks pre-commit hook active
- [x] .gitignore covers env, keys, keystore, reference, private-evidence
- [x] scripts/check-clean.mjs wired into pre-commit
- [x] reference clones present (gitignored)
- [x] .env.example committed, .env.local generated with fresh wallets (gitignored)
- [x] pnpm workspace skeleton

## P1 Phase D: discovery E1 to E7 on mainnet  [GATE D]
- [ ] E1 transfer timing
- [ ] E2 batch tx contents
- [ ] E3 buyer fund lock timing
- [ ] E4 failure modes
- [ ] E5 reconcile writer credit from chain
- [ ] E6 strike gas cost
- [ ] E7 browser withdraw
- [ ] DISCOVERY.md complete

## P2 Phase C: contracts  [GATE C]
- [x] HonorarRegistry.sol
- [x] HonorarLedger.sol
- [x] unit tests for every function and error
- [x] fuzz tests
- [x] invariant tests
- [x] golden vectors shared with kernel
- [ ] fork test against Arc mainnet (partial: stock Foundry lacks the native transfer precompile; needs arc-foundry build)
- [x] Deploy script
- [ ] Deployed to Arc mainnet and source verified
- [ ] registerWork and setMandate executed on mainnet

## P3 Phase K: kernel  [GATE K]
- [x] types (I10), normalization NORM_V1
- [x] citation verification, refusal reasons
- [x] completeness sweep and OWED
- [x] leaves, Merkle, bundle
- [x] unit, property and golden-vector tests green, coverage report

## P4 Phase G: Gateway rail and reconciler  [GATE G]
- [ ] read endpoint with x402 (code written, awaits mainnet run)
- [ ] buyer client with caps, payee pinning, no retry after sign
- [ ] reconciler and batch reconciliation
- [ ] 20 reading fees observed to completed

## P5 Phase A: agent service  [GATE A]
- [x] corpus ingest and store
- [ ] loop with SSE stream
- [x] model proposals only
- [ ] house reader and connected reader
- [ ] bundle storage and endpoint
- [ ] ERC-8004 registration and validator feedback
- [ ] connected answer and house answer struck on mainnet

## P6 Phase V: verifier  [GATE V]
- [x] V1 to V9 CLI
- [ ] browser build
- [ ] CI job with restricted network
- [ ] passes on mainnet answers, fails on tampered bundles

## P7 Phase B: break campaign  [GATE B]
- [ ] B1 to B11 plus control

## P8 Phase M: benchmark  [GATE M]
- [ ] questions committed before results
- [ ] four arms, metrics, second model
- [ ] run_manifest.json

## P9 Phase U: UI  [GATE U]
- [ ] design system, fonts, motion engine
- [ ] landing with all sections
- [ ] hero object (3D and SVG fallback), brand assets
- [ ] app pages: Ask, Library, Earnings, Ledger, Verify, Proof, Agent
- [ ] wallet integration, disconnect power button

## P10 Phase Q: QA  [GATE Q]
- [ ] Playwright matrix on 9 viewports
- [ ] Lighthouse and contrast
- [ ] evidence/qa.json

## P11 Phase R: docs  [GATE R]
- [ ] README per 19.1
- [ ] DISCOVERY, INVARIANTS, ARCHITECTURE, EVIDENCE, PROOF, MILESTONES, PROGRESS, LIMITATIONS, SECURITY
- [ ] docs/BENCHMARK.md, docs/DEMO-SCRIPT.md, docs/BLOG.md
- [ ] check-clean passes, no dashes

## P12 Phase S: ship  [GATE S]
- [ ] full pipeline green
- [ ] Vercel and Render deployed
- [ ] judge path verified on production
- [ ] human submits on DoraHacks

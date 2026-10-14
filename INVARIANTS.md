# INVARIANTS

Each invariant is independently checkable.

| ID | Name | Rule | Enforced in | Test | Verifier | Attack |
|---|---|---|---|---|---|---|
| I1 | SPAN | A paid span is an exact substring (after NORM_V1) of a source whose sha256 equals the registered contentHash | kernel | `kernel.test.ts` REFUSED_NOT_IN_SOURCE, REFUSED_SOURCE_CHANGED | V2, V3 | B1, B2 |
| I2 | USE | A paid span appears quoted in the answer | kernel | `kernel.test.ts` REFUSED_NOT_IN_ANSWER | V3 | B3 |
| I3 | COMPLETE | Every verified quoted span is paid or recorded OWED | kernel | `kernel.test.ts` completeness sweep | V4 | B9 |
| I4 | ONCE | `(answerId, workId)` is struck at most once | contract | `Ledger.t.sol` test_I4_* | V6 | B4 |
| I5 | MANDATE | Strike total is within the per-answer and 24h caps | contract | `Ledger.t.sol` test_I5_*, `Invariant.t.sol` | V6 | B5 |
| I6 | VERSION | Strike reverts if the work changed since pricing | contract | `Ledger.t.sol` test_I6_version_swap_reverts | V7 | B6 |
| I7 | ROOT | On-chain root equals the recomputed Merkle root | contract + verifier | `Ledger.t.sol` test_I7_forged_root_reverts, `Vectors.t.sol` | V5 | B7 |
| I8 | FRONTED | Fronted reading fees equal the committed Gateway transfers | reconciler | `verifier.test.ts` | V8 | B10 |
| I9 | NETTING | Transfers to a writer in a batch do not exceed observed credit | reconciler | `agent.test.ts` | V9 | pending mainnet data |
| I10 | NO-MODEL-MONEY | No model output is typed as amount, address or price | kernel types | `kernel.test.ts` model money | n/a | B11 |
| I11 | NO-RETRY-AFTER-SIGN | A signed payment is never retried | agent | buyer hooks never return recovered | n/a | B8 |
| I12 | CLEAN-ROOM | Verifier needs only the bundle and an Arc RPC | verifier | `ChainReader` interface | V1 to V7 | n/a |

Normalization is `NORM_V1`: NFKC, lowercase, curly quotes to straight, strip zero-width characters, unify dashes, collapse whitespace. Nothing else.

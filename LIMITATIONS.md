# LIMITATIONS

- Reading fees for co-authored works go to `recipients[0]` in v1. Honorarium strikes split correctly on chain.
- The 24h mandate window resets once the first spend is older than 24h (fixed window per reader), not a continuous sliding window.
- One honorarium per work per answer. Multiple distinct spans from one work are listed in the receipt and paid once.
- The writer credit view used for netting reconciliation (I9) depends on archive reads being available from the RPC. Where it is not, the verdict is UNKNOWN, never guessed.
- Foundry fork tests cannot execute the Arc native transfer precompile with stock Foundry. The fork test degrades to a skip. Strike behaviour is covered by the unit suite and by mainnet evidence.
- Explorer source verification is behind a bot challenge. Both contracts are verified on Sourcify with an exact match.
- Gateway withdrawal from a browser wallet (E7) has not been established yet. A CLI path is the fallback.
- Free-tier model providers rate-limit and return 503 under load; the agent retries and falls back to the second provider, and a failed draft after a paid read leaves that reading fee unreimbursed.
- Quotes shorter than 8 words or longer than 80 words are refused by design.
- Reading fees settle in minutes, not seconds (measured p50 and range in DISCOVERY.md). The UI shows the four states and never calls a fee paid before `completed`.
- Strike cost was measured for single-leaf answers only.
- The benchmark runs the payout policies offline over a small corpus, so it shows the policy gap, not production-scale traffic.

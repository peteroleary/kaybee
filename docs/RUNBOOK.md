# We3 Operational Runbook

## Diagnostic Commands

```bash
# Validate local environment setup and configuration contracts
pnpm verify

# Check agent type coverage
pnpm type-check
Common Operational Fixes
Issue: Agent Run Engine Stalls on 'Running' State
Check src/lib/autonomy/leaderElection.ts state logs[cite: 2].

Verify Gemini API quota limits in src/server/middleware/rateLimit.ts[cite: 2].

Clear local in-memory store by toggling memoryRepository.ts[cite: 2].
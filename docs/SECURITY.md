# We3 Security & Data Privacy

## Data Isolation Policy

1. **Zero Public Model Training:** Customer inputs and lease/financial documents processed through We3 are never used to train public foundation models.
2. **Local Agent Execution Option:** High-sensitivity tasks can be routed to local LLM instances (via LM Studio Bionic / Qwen) running entirely on local hardware without cloud data transmission.
3. **API Middleware Security:** All incoming request payloads are rate-limited (`rateLimit.ts`) and checked against strict Zod schema contracts (`parse.ts`) to prevent prompt injection and buffer overflow attacks[cite: 1, 2].
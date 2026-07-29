# We3 Testing Suite

We3 utilizes **Vitest** for fast unit and integration testing across autonomy engines, repository layer mocks, and proposal logic[cite: 2].

## Running Tests

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
Critical Test Suites
src/lib/autonomy/coordinator.test.ts: Tests multi-card task routing and execution progression[cite: 2].

src/lib/autonomy/eligibility.test.ts: Verifies card status transitions and prerequisite dependency checks[cite: 2].

src/lib/repository/firestoreRepository.test.ts: Validates database mutations and fallback logic[cite: 2].
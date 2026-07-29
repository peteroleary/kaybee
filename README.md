# We3 (`we3.live`)

> **You, Me, and AI — In This Together.**

We3 is an agent-driven collaborative workspace that connects the **Customer**, the **Orchestrator AI**, and **You (The Operator)** into a frictionless execution loop. Rather than handing clients a cold chatbot or forcing human staff to do manual data entry, We3 transforms incoming operational requests into structured, autonomous agent runs that you inspect, adjust, and approve in seconds.

---

## The We3 Triad

[ Customer Request ] ──> [ Orchestrator AI Staging ] ──> [ Human Approval ] ──> [ Execution ]


1. **The Customer:** Inputs raw unstructured requests, lease PDFs, property URLs, or project scopes into the client layer.
2. **The Orchestrator AI:** Decomposes objectives into concrete plan proposals, coordinates specialist agents, and stages action cards on the board.
3. **You (The Operator):** Review staged proposals, tweak parameters with total strategic oversight, and dispatch finished work back to the customer.

---

## Tech Stack

* **Frontend:** React 18, TypeScript, Tailwind CSS, Vite
* **Backend Runtime:** Node.js / Bun, Express API layer[cite: 1, 2]
* **Database & Persistence:** Firestore (`firestoreRepository.ts`) with zero-latency fallback (`memoryRepository.ts`)
* **Autonomous Run Engine:** In-memory distributed coordinator, eligibility evaluator, and feed-forward context engine (`src/lib/autonomy/`)
* **AI Orchestration:** Gemini 3.6 Flash / 3.1 Pro APIs, Claude Code CLI tools, and local open-source models via LM Studio Bionic[cite: 1, 2]

---

## Getting Started

### Prerequisites
* Node.js v20+ or Bun 1.1+
* Gemini API Key

### Installation

```bash
# Clone the repository
git clone [https://github.com/peteroleary/we3.git](https://github.com/peteroleary/we3.git)
cd we3

# Install dependencies
pnpm install

# Environment setup
cp .env.example .env
Set your API key inside .env[cite: 1]:

Code snippet
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
Running Locally
Bash
# Start Vite frontend and Node backend concurrently
pnpm dev
Visit http://localhost:5173 to launch We3.

Project Structure
src/
├── components/          # Reusable UI primitives and modal host[cite: 1, 2]
├── features/
│   ├── goals/           # Goal intake, plan preview, and execution UI
│   ├── orchestrator/    # Orchestrator Dock and Proposal Cards
│   └── runs/            # Live agent run console and autonomy controls
├── lib/
│   ├── agents/          # Built-in agent definitions and assignment logic
│   ├── autonomy/        # Run coordinator, execution engine, feed-forward state[cite: 2]
│   ├── goals/           # Goal-to-plan translation logic[cite: 2]
│   ├── orchestrator/     # Thread store and proposal generation[cite: 2]
│   └── repository/      # Firestore and memory workspace persistence[cite: 2]
└── shared/
    └── contracts/       # Zod schemas & TypeScript type contracts[cite: 2]
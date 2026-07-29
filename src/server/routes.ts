import express from "express";
import {
  callOrchestrator,
  callTranscribe,
  callAgentRun,
  callSmartSuggestions,
  callGoalDecomposition,
} from "./api/gemini.js";
import { ModelResponseError } from "./api/parse.js";
import { requireAuth, type AuthedRequest } from "./middleware/auth.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { AgentRunRequestSchema } from "../shared/contracts/agentRun.js";
import type { RunErrorCode } from "../shared/contracts/agentRun.js";

const router = express.Router();

router.use(express.json({ limit: "10mb" }));

// Health Check Endpoint — intentionally unauthenticated and unrated so
// uptime checks never depend on Firebase Admin or an AI quota.
router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Everything below this point requires auth (gated by AUTH_REQUIRED — see
// src/server/middleware/auth.ts) and is subject to per-uid/IP rate limiting.
router.use(requireAuth());
router.use(rateLimit());

function errorCodeToStatus(code: RunErrorCode): number {
  switch (code) {
    case "invalid_input":
      return 400;
    case "rate_limited":
      return 429;
    case "timeout":
      return 504;
    case "budget_exhausted":
      return 402;
    case "provider_error":
      return 502;
    case "aborted":
      return 400;
    case "internal":
    default:
      return 500;
  }
}

// Goal Decomposition Endpoint (for Goal-Oriented UX)
router.post("/goal-decompose", async (req, res) => {
  try {
    const { goal, currentBoard } = req.body;

    if (!goal || !goal.title) {
      return res.status(400).json({ error: "Goal with title is required" });
    }

    const result = await callGoalDecomposition(goal, currentBoard);
    return res.json(result);
  } catch (error: any) {
    if (error instanceof ModelResponseError) {
      console.error(`[goal-decompose] invalid model response (${error.context}):`, error.raw, error.issues);
      return res.status(502).json({ error: "invalid_model_response", details: error.issues });
    }
    console.error("Goal decomposition error:", error);
    return res.status(500).json({
      error: "Failed to decompose goal",
      details: error.message || "Internal server error",
    });
  }
});

// Orchestrator AI Endpoint — multi-turn, context-carrying. The client sends
// {threadId, message, context, history, summary}; the response is the bare
// OrchestratorResponse ({summary, proposal}). The transitional top-level
// newLists/newCards duplicates were dropped in Phase 6 with OrchestratorModal.
router.post("/orchestrate", async (req, res) => {
  try {
    const { message, context, history, summary } = req.body ?? {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message (string) is required" });
    }

    const result = await callOrchestrator({
      message,
      context: typeof context === "string" ? context : undefined,
      history,
      summary: typeof summary === "string" ? summary : undefined,
    });

    return res.json({
      summary: result.summary,
      proposal: result.proposal,
    });
  } catch (error: any) {
    if (error instanceof ModelResponseError) {
      console.error(`[orchestrate] invalid model response (${error.context}):`, error.raw, error.issues);
      return res.status(502).json({ error: "invalid_model_response", details: error.issues });
    }
    console.error("Orchestrator error:", error);
    return res.status(500).json({
      error: "Failed to process orchestrator request",
      details: error.message || "Internal server error",
    });
  }
});

// Audio & Voice Transcription Endpoint
router.post("/transcribe", async (req, res) => {
  try {
    const { audioData, mimeType, textQuery } = req.body;

    if (!textQuery && !audioData) {
      return res.status(400).json({ error: "audioData or textQuery is required" });
    }

    const result = await callTranscribe(audioData, mimeType, textQuery);
    return res.json(result);
  } catch (error: any) {
    console.error("Transcribe error:", error);
    return res.status(500).json({
      error: "Failed to transcribe audio",
      details: error.message,
    });
  }
});

// Agent Task Runner Endpoint
router.post("/agent-run", async (req: AuthedRequest, res) => {
  const parsedRequest = AgentRunRequestSchema.safeParse(req.body);

  if (!parsedRequest.success) {
    return res.status(400).json({
      ok: false,
      error: { code: "invalid_input", message: "Invalid agent-run request.", retryable: false },
      details: parsedRequest.error.issues,
    });
  }

  const idempotencyKey = req.header("Idempotency-Key") || parsedRequest.data.runId;

  try {
    const result = await callAgentRun(parsedRequest.data, idempotencyKey);
    // NOTE: narrowing via `"error" in result` rather than `!result.ok` — this
    // repo's tsconfig has no strictNullChecks, under which TS does not
    // reliably narrow discriminated unions on a boolean-literal tag alone.
    if ("error" in result) {
      return res.status(errorCodeToStatus(result.error.code)).json(result);
    }
    return res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof ModelResponseError) {
      console.error(`[agent-run] invalid model response (${error.context}):`, error.raw, error.issues);
      return res.status(502).json({
        ok: false,
        error: { code: "provider_error", message: "Model returned an invalid response.", retryable: true },
      });
    }
    console.error("Agent execution error:", error);
    return res.status(500).json({
      ok: false,
      error: { code: "internal", message: error.message || "Failed to execute agent task", retryable: true },
    });
  }
});

// Smart Suggestions Engine Endpoint
router.post("/smart-suggestions", async (req, res) => {
  try {
    const { title, description, entityType, priority, tags } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Card title is required" });
    }

    const result = await callSmartSuggestions(title, description, entityType, priority, tags);
    return res.json(result);
  } catch (error: any) {
    if (error instanceof ModelResponseError) {
      console.error(`[smart-suggestions] invalid model response (${error.context}):`, error.raw, error.issues);
      return res.status(502).json({ error: "invalid_model_response", details: error.issues });
    }
    console.error("Smart suggestions error:", error);
    return res.status(500).json({
      error: "Failed to generate smart suggestions",
      details: error.message,
    });
  }
});

export default router;

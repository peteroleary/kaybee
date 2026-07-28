import express from "express";
import { callOrchestrator, callTranscribe, callAgentRun, callSmartSuggestions, callGoalDecomposition } from "./api/gemini.js";

const router = express.Router();

router.use(express.json({ limit: "10mb" }));

// Health Check Endpoint
router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Goal Decomposition Endpoint (NEW - for Goal-Oriented UX)
router.post("/goal-decompose", async (req, res) => {
  try {
    const { goal, currentBoard } = req.body;

    if (!goal || !goal.title) {
      return res.status(400).json({ error: "Goal with title is required" });
    }

    const result = await callGoalDecomposition(goal, currentBoard);
    return res.json(result);
  } catch (error: any) {
    console.error("Goal decomposition error:", error);
    return res.status(500).json({
      error: "Failed to decompose goal",
      details: error.message || "Internal server error"
    });
  }
});

// Orchestrator AI Endpoint
router.post("/orchestrate", async (req, res) => {
  try {
    const { prompt, currentBoard } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const result = await callOrchestrator(prompt, currentBoard);
    return res.json(result);
  } catch (error: any) {
    console.error("Orchestrator error:", error);
    return res.status(500).json({
      error: "Failed to process orchestrator request",
      details: error.message || "Internal server error"
    });
  }
});

// Audio & Voice Transcription Endpoint
router.post("/transcribe", async (req, res) => {
  try {
    const { audioData, mimeType, textQuery } = req.body;

    const result = await callTranscribe(audioData, mimeType, textQuery);
    return res.json(result);
  } catch (error: any) {
    console.error("Transcribe error:", error);
    return res.status(500).json({
      error: "Failed to transcribe audio",
      details: error.message
    });
  }
});

// Agent Task Runner Endpoint
router.post("/agent-run", async (req, res) => {
  try {
    const { cardTitle, cardDescription, prompt, widgets } = req.body;

    const result = await callAgentRun(cardTitle, cardDescription, prompt, widgets);
    return res.json(result);
  } catch (error: any) {
    console.error("Agent execution error:", error);
    return res.status(500).json({
      error: "Failed to execute agent task",
      details: error.message
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
    console.error("Smart suggestions error:", error);
    return res.status(500).json({
      error: "Failed to generate smart suggestions",
      details: error.message
    });
  }
});

export default router;

// Wraps a single Anthropic API call for one agent: builds the per-call
// context, sends it with the agent's compressed identity as the system
// prompt, and parses the structured JSON response.
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";
import { buildSystemPrompt } from "./identities.js";

export const MODEL = "claude-sonnet-5";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildContextBlock({
  worldStateText,
  relationshipText,
  memoryText,
  eventDescription,
}) {
  return [
    `EVENT: ${eventDescription}`,
    "",
    `WORLD STATE SO FAR:\n${worldStateText || "(nothing yet — the world is empty)"}`,
    "",
    `YOUR RELATIONSHIPS:\n${relationshipText || "(no relationships formed yet)"}`,
    "",
    `YOUR MEMORY:\n${memoryText || "(no memories yet)"}`,
    "",
    "React in character to the event above, given the world state, your relationships, and your memory. Respond with JSON only.",
  ].join("\n");
}

// Best-effort field extraction for a JSON reply that got cut off mid-string
// (hit max_tokens) — pulls whatever text was captured for a field even
// without a closing quote, so a truncated reply degrades to a partial
// sentence instead of leaking raw JSON into the UI.
function extractField(text, field) {
  const match = text.match(
    new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)`),
  );
  if (!match) return null;
  return match[1]
    .replace(/\\n/g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .trim();
}

// Strips accidental markdown fences and parses the model's JSON reply.
// Falls back to a best-effort shape so one malformed reply doesn't crash
// the whole tick.
function parseAgentResponse(rawText, agent) {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "");
  try {
    const parsed = JSON.parse(cleaned);
    return {
      state: parsed.state === "shadow" ? "shadow" : "light",
      proposal: String(parsed.proposal ?? "").trim() || "(no proposal given)",
      reasoning: String(parsed.reasoning ?? "").trim(),
      relationshipShifts: Array.isArray(parsed.relationship_shifts)
        ? parsed.relationship_shifts
        : [],
    };
  } catch (err) {
    console.warn(
      `[${agent.key}] Failed to parse JSON response, using raw text. Error: ${err.message}`,
    );
    return {
      state: agent.current_state,
      proposal:
        extractField(cleaned, "proposal") ||
        "(response was cut off before a proposal could be read)",
      reasoning: extractField(cleaned, "reasoning") || "",
      relationshipShifts: [],
    };
  }
}

// Lower-level call shared by the tick loop (structured JSON reply) and
// conversations (plain spoken text) — same agent identity, different
// system-prompt suffix and expected reply shape.
export async function callAgentRaw(
  agent,
  systemSuffix,
  userMessage,
  maxTokens = 700,
) {
  // Note: `temperature` is not supported by this model (the API rejects it
  // outright) — voice differentiation relies entirely on the written
  // identity/voice text below, not a sampling-randomness dial.
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: `${buildSystemPrompt(agent)}${systemSuffix ? `\n\n${systemSuffix}` : ""}`,
    messages: [{ role: "user", content: userMessage }],
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export async function callAgent(agent, context) {
  const rawText = await callAgentRaw(
    agent,
    "",
    buildContextBlock(context),
    1000,
  );
  return parseAgentResponse(rawText, agent);
}

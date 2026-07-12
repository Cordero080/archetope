// Explains *why* a world_state entry sounds like that particular agent —
// a separate, on-demand call that reads the already-finished text fresh
// (like a reader analyzing it after the fact), not the agent narrating an
// explanation of itself while writing the line. Deliberately decoupled
// from agentClient's tick-generation call so it can never make that path's
// replies longer (that's exactly what caused the truncation bugs earlier).
import { anthropic, MODEL } from "./agentClient.js";

const INSIGHT_SYSTEM = `You are a sharp literary/psychological analyst. You're given an agent's fixed identity — a tarot archetype with a light and shadow pole, and an MBTI type — plus something they just said or did. Identify the single phrase or sentence from their text that most clearly reveals their archetypal/MBTI nature, and explain why in three short, specific parts. Ground the explanation in the actual identity given, not generic MBTI trivia — say why *this specific phrase*, not just "the Hierophant values tradition" restated.

Respond ONLY with valid JSON, no markdown fences, matching this shape:
{"target_sentence":"<verbatim, exact substring copied character-for-character from the text below>","arcana_note":"one sentence on how this reflects their tarot archetype's light or shadow pole","mbti_note":"one sentence on the specific MBTI cognitive style at play","state_note":"one sentence on whether this is their light or shadow expression, and why"}

"target_sentence" MUST be copied exactly from the provided text — do not paraphrase, do not summarize, do not add or remove words.`;

export async function generateInsight({
  archetype,
  mbti,
  identityBlock,
  state,
  text,
}) {
  const userMessage = [
    `IDENTITY: ${identityBlock}`,
    `CURRENT STATE: ${state || "light"}`,
    `TEXT TO ANALYZE:\n${text}`,
  ].join("\n\n");

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: INSIGHT_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "");

  const parsed = JSON.parse(raw);

  return {
    archetype,
    mbti,
    targetSentence: String(parsed.target_sentence ?? "").trim(),
    arcanaNote: String(parsed.arcana_note ?? "").trim(),
    mbtiNote: String(parsed.mbti_note ?? "").trim(),
    stateNote: String(parsed.state_note ?? "").trim(),
  };
}

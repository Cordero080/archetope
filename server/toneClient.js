// Classifies the emotional tone of the one conversation message - a separate, checap call, same pattern as insightCLient.js's generateInsight.

import { anthropic, MODEL } from "./agentClient.js";

const TONE_SYSTEM = `You read one to two lines from a conversation between two characters and decide its emotional tone. Respond with ONLY one lowercase word, nothing else: "conflict" if it's confrontational, critical, or tense; "humor" if it's a joke or comedic; "friendly" if it's warm, supportive, or affectionate; or "none" if it's just neutral/informational.`;

export async function classifyTone(message) {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 10,
    system: TONE_SYSTEM,
    messages: [{ role: "user", content: message }],
  });

  const raw = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim()
    .toLowerCase();
  return ["conflict", "humor", "friendly"].includes(raw) ? raw : null;
}

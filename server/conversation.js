// A direct, turn-taking exchange between two agents — each turn, the
// speaker sees the other agent's actual words (not just the aggregated
// world_state log), and replies to them directly. Distinct from the tick
// loop's one-shot "what do you build" proposals.

// ---------- IMPORTS ----------
import { query } from "./db.js";
import { callAgentRaw } from "./agentClient.js";
import { classifyTone } from "./toneClient.js";

// ---------- CONFIG ----------
const TURNS_PER_CONVERSATION = 4;

const CONVERSATION_SYSTEM_SUFFIX = `You are now in a direct, spoken conversation with another agent — not building, not proposing, just talking to them. Reply with ONLY the words you say out loud: 1-2 sentences, no narration, no stage directions, no quotation marks, no JSON. Speak in your own established voice and sense of humor from your identity above — not a generic tone, and not the same way the other agent talks. Plain modern language, no poetic or nature metaphor (no roots, veins, hearths, stones, claws, earth), even if the world-state history was written in a flowery style. Ignore that style completely. You know 2026 technology, so default to modern/high-tech tools and methods over primitive ones.`;

// ---------- HELPERS ----------
function buildTurnPrompt({
  eventDescription,
  worldStateText,
  listener,
  transcriptText,
}) {
  return [
    `EVENT: ${eventDescription}`,
    `WORLD STATE SO FAR:\n${worldStateText || "(nothing yet)"}`,
    `You are talking directly with ${listener.archetype}.`,
    transcriptText
      ? `CONVERSATION SO FAR:\n${transcriptText}`
      : `You're starting this conversation. Say the first thing to them.`,
    `Reply as yourself, speaking directly to ${listener.archetype}. Just the words you say.`,
  ].join("\n\n");
}

// Picks two agents to converse this tick. MVP: random pair, no repeats.
export function pickConversationPair(agents) {
  if (agents.length < 2) return null;
  const shuffled = [...agents].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

// ---------- MAIN ----------
export async function runConversation({
  agentA,
  agentB,
  eventId,
  eventDescription,
  worldStateText,
}) {
  const { rows } = await query(
    `INSERT INTO conversations (event_id, agent_a_id, agent_b_id) VALUES ($1, $2, $3) RETURNING id`,
    [eventId, agentA.id, agentB.id],
  );
  const conversationId = rows[0].id;

  const participants = [agentA, agentB];
  const turns = [];
  let transcriptText = "";

  for (let i = 0; i < TURNS_PER_CONVERSATION; i++) {
    const speaker = participants[i % 2];
    const listener = participants[(i + 1) % 2];

    const userMessage = buildTurnPrompt({
      eventDescription,
      worldStateText,
      listener,
      transcriptText,
    });

    const message = await callAgentRaw(
      speaker,
      CONVERSATION_SYSTEM_SUFFIX,
      userMessage,
      150,
    );

    const tone = await classifyTone(message);

    transcriptText += `${speaker.archetype}: ${message}\n`;
    turns.push({
      turnIndex: i,
      agentId: speaker.id,
      agentKey: speaker.key,
      archetype: speaker.archetype,
      message,
    });

    await query(
      `INSERT INTO conversation_turns (conversation_id, agent_id, turn_index, message, tone)
       VALUES ($1, $2, $3, $4, $5)`,
      [conversationId, speaker.id, i, message, tone],
    );
  }

  // Each participant keeps a memory of having had this conversation, so
  // future ticks/conversations can reference it.
  for (const agent of participants) {
    const other = agent.id === agentA.id ? agentB : agentA;
    const ownLines = turns
      .filter((t) => t.agentId === agent.id)
      .map((t) => `"${t.message}"`)
      .join(" ");
    const summary = `Event: "${eventDescription}" — I talked with ${other.archetype}. I said: ${ownLines}`;
    await query(
      `INSERT INTO memory (agent_id, event_id, summary) VALUES ($1, $2, $3)`,
      [agent.id, eventId, summary],
    );
  }

  const trim = ({ id, key, archetype, mbti, current_state }) => ({
    id,
    key,
    archetype,
    mbti,
    current_state,
  });

  return { conversationId, agentA: trim(agentA), agentB: trim(agentB), turns };
}

// The tick loop: an event fires, relevant agents wake, each makes one LLM
// call in character, and their responses update world_state, relationships,
// and memory. Agents never message each other directly (stigmergy) — they
// only see world_state/relationships/memory as of *before* this tick; they
// perceive each other's actions on the next tick they're woken for.
import { query } from "./db.js";
import { callAgent } from "./agentClient.js";
import { pickConversationPair, runConversation } from "./conversation.js";

async function getAllAgents() {
  const { rows } = await query("SELECT * FROM agents ORDER BY id");
  return rows;
}

// MVP: every event wakes every agent (a world-awakening event affects
// everyone equally). A real event stream would filter agents by relevance
// here — e.g. only agents with a stake in the event's topic/location.
async function getRelevantAgents(_eventDescription, allAgents) {
  return allAgents;
}

async function getWorldStateText() {
  const { rows } = await query(
    `SELECT ws.description, a.archetype
     FROM world_state ws
     LEFT JOIN agents a ON a.id = ws.built_by
     ORDER BY ws.created_at ASC`,
  );
  if (rows.length === 0) return "";
  return rows
    .map((r) =>
      r.archetype
        ? `- [${r.archetype}] ${r.description}`
        : `- ${r.description}`,
    )
    .join("\n");
}

async function getRelationshipText(agentId, agentsByKeyId) {
  const { rows } = await query(
    `SELECT * FROM relationships WHERE agent_a_id = $1 OR agent_b_id = $1`,
    [agentId],
  );
  if (rows.length === 0) return "";
  return rows
    .map((r) => {
      const otherId = r.agent_a_id === agentId ? r.agent_b_id : r.agent_a_id;
      const other = agentsByKeyId.get(otherId);
      return `- ${other.archetype}: sentiment ${r.sentiment}`;
    })
    .join("\n");
}

async function getMemoryText(agentId, limit = 5) {
  const { rows } = await query(
    `SELECT summary FROM memory WHERE agent_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [agentId, limit],
  );
  if (rows.length === 0) return "";
  return rows
    .reverse()
    .map((r) => `- ${r.summary}`)
    .join("\n");
}

function pairIds(idA, idB) {
  return idA < idB ? [idA, idB] : [idB, idA];
}

// Model replies sometimes name the agent by archetype ("The Magician")
// instead of the requested key ("magician") — accept either.
function resolveAgent(towardKey, agentsByKey) {
  if (agentsByKey.has(towardKey)) return agentsByKey.get(towardKey);
  const normalized = String(towardKey || "")
    .toLowerCase()
    .replace(/^the\s+/, "")
    .trim();
  for (const agent of agentsByKey.values()) {
    if (agent.key === normalized) return agent;
    if (agent.archetype.toLowerCase().replace(/^the\s+/, "") === normalized) {
      return agent;
    }
  }
  return null;
}

async function applyRelationshipShift(
  agentId,
  towardKey,
  delta,
  reason,
  eventId,
  agentsByKey,
) {
  const other = resolveAgent(towardKey, agentsByKey);
  if (!other || other.id === agentId) return; // unknown or self-reference, skip
  const [a, b] = pairIds(agentId, other.id);

  await query(
    `INSERT INTO relationships (agent_a_id, agent_b_id, sentiment, history)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (agent_a_id, agent_b_id)
     DO UPDATE SET
       sentiment = relationships.sentiment + EXCLUDED.sentiment,
       history = relationships.history || EXCLUDED.history,
       updated_at = now()`,
    [
      a,
      b,
      delta,
      JSON.stringify([{ event_id: eventId, delta, reason, by: agentId }]),
    ],
  );
}

async function applyAgentResponse(agent, response, eventId, agentsByKey) {
  await query(
    `INSERT INTO world_state (description, built_by, event_id, state) VALUES ($1, $2, $3, $4)`,
    [response.proposal, agent.id, eventId, response.state],
  );

  if (response.state !== agent.current_state) {
    await query(`UPDATE agents SET current_state = $1 WHERE id = $2`, [
      response.state,
      agent.id,
    ]);
  }

  for (const shift of response.relationshipShifts) {
    const delta = Math.max(-2, Math.min(2, Number(shift.delta) || 0));
    await applyRelationshipShift(
      agent.id,
      shift.toward,
      delta,
      shift.reason ?? "",
      eventId,
      agentsByKey,
    );
  }

  const memorySummary = `Event: "${await getEventDescription(eventId)}" — I (${response.state}) proposed: ${response.proposal}`;
  await query(
    `INSERT INTO memory (agent_id, event_id, summary) VALUES ($1, $2, $3)`,
    [agent.id, eventId, memorySummary],
  );
}

async function getEventDescription(eventId) {
  const { rows } = await query("SELECT description FROM events WHERE id = $1", [
    eventId,
  ]);
  return rows[0]?.description ?? "";
}

export async function tick(eventDescription) {
  const { rows: eventRows } = await query(
    "INSERT INTO events (description) VALUES ($1) RETURNING id",
    [eventDescription],
  );
  const eventId = eventRows[0].id;

  const allAgents = await getAllAgents();
  const agentsById = new Map(allAgents.map((a) => [a.id, a]));
  const agentsByKey = new Map(allAgents.map((a) => [a.key, a]));
  const relevantAgents = await getRelevantAgents(eventDescription, allAgents);

  console.log("=".repeat(80));
  console.log(`TICK — event #${eventId}: ${eventDescription}`);
  console.log("=".repeat(80));

  // World state and relationships are read once, before any agent in this
  // tick responds — agents react to the world as it was, not to each other's
  // simultaneous responses this tick (that's the stigmergy rule).
  const worldStateText = await getWorldStateText();
  const results = [];

  for (const agent of relevantAgents) {
    const relationshipText = await getRelationshipText(agent.id, agentsById);
    const memoryText = await getMemoryText(agent.id);

    const response = await callAgent(agent, {
      worldStateText,
      relationshipText,
      memoryText,
      eventDescription,
    });

    console.log(
      `\n--- ${agent.archetype} (${agent.mbti}) [${response.state.toUpperCase()}] ---`,
    );
    console.log(`Proposal: ${response.proposal}`);
    if (response.reasoning) console.log(`Reasoning: ${response.reasoning}`);
    if (response.relationshipShifts.length > 0) {
      console.log(
        `Relationship shifts: ${response.relationshipShifts
          .map(
            (s) =>
              `${s.toward} (${s.delta >= 0 ? "+" : ""}${s.delta}): ${s.reason}`,
          )
          .join("; ")}`,
      );
    }

    await applyAgentResponse(agent, response, eventId, agentsByKey);

    results.push({
      key: agent.key,
      archetype: agent.archetype,
      mbti: agent.mbti,
      state: response.state,
      proposal: response.proposal,
      reasoning: response.reasoning,
      relationshipShifts: response.relationshipShifts,
    });
  }

  // One direct conversation per tick, alongside the build proposals above —
  // agents actually reply to each other's words here, unlike the stigmergy
  // loop, which only reacts to the aggregated world_state log.
  let conversation = null;
  const pair = pickConversationPair(relevantAgents);
  if (pair) {
    const [agentA, agentB] = pair;
    console.log(
      `\n--- Conversation: ${agentA.archetype} ↔ ${agentB.archetype} ---`,
    );
    conversation = await runConversation({
      agentA,
      agentB,
      eventId,
      eventDescription,
      worldStateText,
    });
    for (const turn of conversation.turns) {
      console.log(`${turn.archetype}: ${turn.message}`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("Tick complete. World state and relationships updated.");
  console.log("=".repeat(80));

  return { eventId, eventDescription, results, conversation };
}

// ---------- IMPORTS ----------
import { accentFor, formatRelativeTime } from "./helpers.js";

// ---------- CONFIG ----------
const conversationsEl = document.getElementById("conversations");
const transcriptOverlay = document.getElementById("transcript-overlay");
const transcriptTitle = document.getElementById("transcript-title");
const transcriptContext = document.getElementById("transcript-context");
const transcriptBody = document.getElementById("transcript-body");
const transcriptClose = document.getElementById("transcript-close");
const agentFocusConversations = document.getElementById(
  "agent-focus-conversations",
);

// Cache of the last-fetched conversation list, so the agent-focus modal's
// Conversations tab can filter to one agent without an extra network call —
// it's already loaded for the main Conversations panel.
export let latestConversations = [];

// ---------- HELPERS ----------
// Builds one clickable conversation row — shared by the main Conversations
// panel and the agent-focus modal's Conversations tab (same row, two places
// it can appear, filtered differently).
function createConversationRow(conv) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "conv-row";

  const head = document.createElement("div");
  head.className = "conv-row__head";

  const pair = document.createElement("span");
  pair.className = "conv-row__pair";
  pair.textContent = `${conv.archetype_a} ↔ ${conv.archetype_b}`;

  const time = document.createElement("span");
  time.className = "conv-row__time";
  time.textContent = formatRelativeTime(conv.started_at);

  head.append(pair, time);

  const snippet = document.createElement("span");
  snippet.className = "conv-row__snippet";
  snippet.textContent = conv.last_message || "";

  row.append(head, snippet);
  row.addEventListener("click", () =>
    openTranscript(conv.id, conv.archetype_a, conv.archetype_b),
  );
  return row;
}

// ---------- MAIN ----------
export function renderConversations(conversations) {
  conversationsEl.textContent = "";
  if (conversations.length === 0) {
    const empty = document.createElement("p");
    empty.className = "conversations__empty";
    empty.textContent = "No conversations yet.";
    conversationsEl.appendChild(empty);
    return;
  }

  for (const conv of conversations) {
    conversationsEl.appendChild(createConversationRow(conv));
  }
}

export async function loadConversations() {
  const res = await fetch("/api/conversations");
  if (!res.ok) return;
  const data = await res.json();
  latestConversations = data.conversations;
  renderConversations(data.conversations);
}

// Filters the cached conversation list down to ones this specific agent
// took part in, for the focus modal's Conversations tab.
export function renderAgentFocusConversations(agent) {
  agentFocusConversations.textContent = "";
  const own = latestConversations.filter(
    (conv) =>
      conv.archetype_a === agent.archetype ||
      conv.archetype_b === agent.archetype,
  );

  if (own.length === 0) {
    const empty = document.createElement("p");
    empty.className = "conversations__empty";
    empty.textContent = `${agent.archetype} hasn't had a direct conversation yet.`;
    agentFocusConversations.appendChild(empty);
    return;
  }

  for (const conv of own) {
    agentFocusConversations.appendChild(createConversationRow(conv));
  }
}

async function openTranscript(id, archetypeA, archetypeB) {
  const res = await fetch(`/api/conversations/${id}`);
  if (!res.ok) return;
  const data = await res.json();

  transcriptTitle.textContent = `${archetypeA} ↔ ${archetypeB}`;
  transcriptContext.textContent = data.eventDescription
    ? `Occasioned by: ${data.eventDescription}`
    : "";
  transcriptContext.hidden = !data.eventDescription;
  transcriptBody.textContent = "";

  for (const turn of data.turns) {
    const item = document.createElement("div");
    item.className = "transcript-turn";
    item.style.setProperty("--agent-color", accentFor(turn.agent_key));

    const speakerRow = document.createElement("div");
    speakerRow.className = "transcript-turn__row";

    const speaker = document.createElement("span");
    speaker.className = "transcript-turn__speaker";
    speaker.textContent = turn.archetype;

    const time = document.createElement("span");
    time.className = "transcript-turn__time";
    time.textContent = formatRelativeTime(turn.created_at);

    const tone = document.createElement("span");
    if (turn.tone) {
      tone.className = `transcript-turn__tone transcript-turn__tone--${turn.tone}`;
      tone.textContent = turn.tone;
    }

    speakerRow.append(speaker, time, tone);

    const message = document.createElement("p");
    message.className = "transcript-turn__message";
    message.textContent = turn.message;

    item.append(speakerRow, message);
    transcriptBody.appendChild(item);
  }

  transcriptOverlay.hidden = false;
}

// ---------- START ----------
transcriptClose.addEventListener("click", () => {
  transcriptOverlay.hidden = true;
});
transcriptOverlay.addEventListener("click", (e) => {
  if (e.target === transcriptOverlay) transcriptOverlay.hidden = true;
});

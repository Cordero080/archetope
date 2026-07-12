const ACCENTS = {
  tower: "var(--c-tower)",
  hierophant: "var(--c-hierophant)",
  star: "var(--c-star)",
  magician: "var(--c-magician)",
};

const agentsEl = document.getElementById("agents");
const relationshipsEl = document.getElementById("relationships");
const timelineEl = document.getElementById("timeline");
const conversationsEl = document.getElementById("conversations");
const tickForm = document.getElementById("tick-form");
const tickBtn = document.getElementById("tick-btn");
const eventInput = document.getElementById("event-input");
const toastStack = document.getElementById("toast-stack");
const transcriptOverlay = document.getElementById("transcript-overlay");
const transcriptTitle = document.getElementById("transcript-title");
const transcriptBody = document.getElementById("transcript-body");
const transcriptClose = document.getElementById("transcript-close");
const infoOverlay = document.getElementById("info-overlay");
const infoTitle = document.getElementById("info-title");
const infoBody = document.getElementById("info-body");
const infoClose = document.getElementById("info-close");
const agentFocusOverlay = document.getElementById("agent-focus-overlay");
const agentFocusTitle = document.getElementById("agent-focus-title");
const agentFocusBody = document.getElementById("agent-focus-body");
const agentFocusClose = document.getElementById("agent-focus-close");

let agentsByKey = new Map();

function accentFor(key) {
  return ACCENTS[key] || "var(--glass-border)";
}

function formatRelativeTime(timestamp) {
  const diffSec = Math.max(
    0,
    Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000),
  );
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

// Shared by the small card and the full-size focus modal, so the two never
// drift out of sync. historyExpanded=true skips the collapse toggle and
// shows every entry, for the focus view.
function buildAgentContent(
  agent,
  latest,
  agentHistory,
  { historyExpanded = false } = {},
) {
  const frag = document.createDocumentFragment();

  const badge = document.createElement("span");
  const state = latest?.state || agent.current_state;
  badge.className = `state-badge state-badge--${state}`;
  badge.textContent = state;
  frag.appendChild(badge);

  const recentStates = agentHistory
    .slice(0, 5)
    .map((entry) => entry.state)
    .filter((s) => s != null);
  if (recentStates.length > 0) {
    const shadowCount = recentStates.filter((s) => s === "shadow").length;
    const shadowPct = Math.round((shadowCount / recentStates.length) * 100);

    const leanWrap = document.createElement("div");
    leanWrap.className = "shadow-lean";
    leanWrap.title = `${shadowPct}% shadow over the last ${recentStates.length} tick${recentStates.length === 1 ? "" : "s"}`;

    const track = document.createElement("div");
    track.className = "shadow-lean__track";

    const marker = document.createElement("div");
    marker.className = "shadow-lean__marker";
    marker.style.left = `${shadowPct}%`;
    track.appendChild(marker);

    const label = document.createElement("span");
    label.className = "shadow-lean__label";
    label.textContent = `${shadowPct}% shadow (last ${recentStates.length})`;

    leanWrap.append(track, label);
    frag.appendChild(leanWrap);
  }

  if (latest) {
    const proposal = document.createElement("p");
    proposal.className = "agent-card__proposal";
    proposal.textContent = latest.proposal;

    const reasoning = document.createElement("p");
    reasoning.className = "agent-card__reasoning";
    reasoning.textContent = latest.reasoning ? `“${latest.reasoning}”` : "";

    frag.append(proposal, reasoning);
  }

  const historyList = document.createElement("ul");
  historyList.className = "agent-card__history";
  historyList.hidden = !historyExpanded;

  agentHistory.forEach((entry, i) => {
    const li = document.createElement("li");
    li.className = "agent-card__history-item";

    const itemHead = document.createElement("div");
    itemHead.className = "agent-card__history-head";

    const num = document.createElement("span");
    num.className = "agent-card__history-num";
    num.textContent = `#${agentHistory.length - i}`;

    const time = document.createElement("span");
    time.className = "agent-card__history-time";
    time.textContent = formatRelativeTime(entry.created_at);

    itemHead.append(num, time);

    const text = document.createElement("p");
    text.className = "agent-card__history-text";
    text.textContent = entry.description;

    li.append(itemHead, text);
    if (entry.id != null) {
      li.appendChild(
        createVisualizeControl(entry.id, {
          url: entry.image_url,
          prompt: entry.image_prompt,
          createdAt: entry.image_created_at,
        }),
      );
    }
    historyList.appendChild(li);
  });

  if (historyExpanded) {
    frag.appendChild(historyList);
  } else {
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "agent-card__toggle";
    toggleBtn.textContent = `▾ History (${agentHistory.length})`;
    toggleBtn.addEventListener("click", () => {
      historyList.hidden = !historyList.hidden;
      toggleBtn.textContent = `${historyList.hidden ? "▾" : "▴"} History (${agentHistory.length})`;
    });
    frag.append(toggleBtn, historyList);
  }

  return frag;
}

function openAgentFocus(agent, latest, agentHistory) {
  agentFocusTitle.textContent = "";
  const name = document.createElement("span");
  name.className = "agent-card__name";
  name.style.setProperty("--agent-color", accentFor(agent.key));
  name.textContent = agent.archetype;
  const mbti = document.createElement("span");
  mbti.className = "agent-card__mbti";
  mbti.textContent = ` ${agent.mbti}`;
  agentFocusTitle.append(name, mbti);

  agentFocusBody.textContent = "";
  agentFocusBody.style.setProperty("--agent-color", accentFor(agent.key));
  agentFocusBody.appendChild(
    buildAgentContent(agent, latest, agentHistory, { historyExpanded: true }),
  );
  agentFocusOverlay.hidden = false;
}

function renderAgents(agents, latestByKey = new Map(), worldState = []) {
  agentsByKey = new Map(agents.map((a) => [a.key, a]));
  agentsEl.textContent = "";

  for (const agent of agents) {
    const agentHistory = worldState
      .filter((entry) => entry.agent_key === agent.key)
      .reverse(); // latest first
    const latest = latestByKey.get(agent.key);
    const card = document.createElement("article");
    card.className = "agent-card";
    card.style.setProperty("--agent-color", accentFor(agent.key));
    card.dataset.agentKey = agent.key;

    const head = document.createElement("div");
    head.className = "agent-card__head";

    const name = document.createElement("span");
    name.className = "agent-card__name";
    name.textContent = agent.archetype;

    const mbti = document.createElement("span");
    mbti.className = "agent-card__mbti";
    mbti.textContent = agent.mbti;

    const focusBtn = document.createElement("button");
    focusBtn.type = "button";
    focusBtn.className = "agent-card__focus-btn";
    focusBtn.textContent = "⤢";
    focusBtn.setAttribute("aria-label", `Focus on ${agent.archetype}`);
    focusBtn.addEventListener("click", () =>
      openAgentFocus(agent, latest, agentHistory),
    );

    const headRight = document.createElement("div");
    headRight.className = "agent-card__head-right";
    headRight.append(mbti, focusBtn);

    head.append(name, headRight);

    card.appendChild(head);
    card.appendChild(buildAgentContent(agent, latest, agentHistory));

    agentsEl.appendChild(card);
  }
}

function renderRelationships(relationships) {
  relationshipsEl.textContent = "";
  if (relationships.length === 0) {
    relationshipsEl.textContent = "No relationships formed yet.";
    return;
  }

  const MAX_SENTIMENT = 10;
  for (const rel of relationships) {
    const row = document.createElement("div");
    row.className = "rel-row";

    const a = document.createElement("span");
    a.className = "rel-row__name";
    a.textContent = rel.a;

    const sentiment = document.createElement("span");
    sentiment.className = "rel-row__sentiment";
    sentiment.textContent =
      rel.sentiment > 0 ? `+${rel.sentiment}` : rel.sentiment;

    const b = document.createElement("span");
    b.className = "rel-row__name";
    b.style.textAlign = "right";
    b.textContent = rel.b;

    const spacer = document.createElement("span");

    const bar = document.createElement("div");
    bar.className = "rel-row__bar";
    const fill = document.createElement("div");
    fill.className = `rel-row__fill${rel.sentiment < 0 ? " rel-row__fill--negative" : ""}`;
    const pct = Math.min(Math.abs(rel.sentiment) / MAX_SENTIMENT, 1) * 50;
    if (rel.sentiment >= 0) {
      fill.style.left = "50%";
      fill.style.width = `${pct}%`;
    } else {
      fill.style.left = `${50 - pct}%`;
      fill.style.width = `${pct}%`;
    }
    bar.appendChild(fill);

    row.append(a, sentiment, spacer, b, bar);
    relationshipsEl.appendChild(row);
  }
}

function renderTimeline(worldState) {
  timelineEl.textContent = "";
  for (const entry of worldState) {
    appendTimelineEntry(entry);
  }
}

function appendTimelineEntry(entry) {
  const {
    archetype,
    agent_key: agentKey,
    description,
    created_at: createdAt,
    id,
  } = entry;

  const item = document.createElement("div");
  item.className = "timeline-entry";
  if (agentKey) item.style.setProperty("--agent-color", accentFor(agentKey));

  const head = document.createElement("div");
  head.className = "timeline-entry__head";

  const tag = document.createElement("span");
  tag.className = "timeline-entry__tag";
  tag.textContent = archetype || "world";

  const time = document.createElement("span");
  time.className = "timeline-entry__time";
  time.textContent = formatRelativeTime(createdAt ?? Date.now());

  head.append(tag, time);

  const text = document.createElement("span");
  text.textContent = description;

  item.append(head, text);
  if (id != null) {
    item.appendChild(
      createVisualizeControl(id, {
        url: entry.image_url,
        prompt: entry.image_prompt,
        createdAt: entry.image_created_at,
      }),
    );
  }
  timelineEl.appendChild(item);
}

function renderImageIntoBox(imageBox, data) {
  imageBox.textContent = "";
  const img = document.createElement("img");
  img.className = "visualize__image";
  img.src = data.b64 ? `data:image/png;base64,${data.b64}` : data.url;
  img.alt = data.prompt || "Generated image";

  const caption = document.createElement("p");
  caption.className = "visualize__caption";
  caption.textContent = data.prompt;

  imageBox.append(img, caption);
  imageBox.dataset.loaded = "true";
}

// Opt-in "🎨 Visualize" control: only fires the (paid) image API when the
// user explicitly clicks it, never automatically. Shared by World State
// entries and the per-agent History dropdown, since both list the same
// underlying world_state rows. If `existing` already has a url (this entry
// was visualized before, in any past session), the image is already saved
// server-side — clicking just reveals it, no API call and no cost.
function createVisualizeControl(worldStateId, existing = {}) {
  const wrap = document.createElement("div");
  wrap.className = "visualize";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "visualize__btn";

  const imageBox = document.createElement("div");
  imageBox.className = "visualize__box";
  imageBox.hidden = true;

  if (existing.url) {
    renderImageIntoBox(imageBox, existing);
    btn.textContent = "🎨 View Image";
  } else {
    btn.textContent = "🎨 Visualize";
  }

  btn.addEventListener("click", async () => {
    if (imageBox.dataset.loaded === "true") {
      imageBox.hidden = !imageBox.hidden;
      btn.textContent = imageBox.hidden
        ? existing.url
          ? "🎨 View Image"
          : "🎨 Visualize"
        : "🎨 Hide image";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Generating…";
    imageBox.hidden = false;
    imageBox.textContent = "Generating image…";

    try {
      const res = await fetch("/api/visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worldStateId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }
      const data = await res.json();
      renderImageIntoBox(imageBox, data);
      btn.textContent = "🎨 Hide image";
    } catch (err) {
      imageBox.textContent = `Couldn't generate image: ${err.message}`;
      btn.textContent = "🎨 Visualize";
    } finally {
      btn.disabled = false;
    }
  });

  wrap.append(btn, imageBox);
  return wrap;
}

function renderConversations(conversations) {
  conversationsEl.textContent = "";
  if (conversations.length === 0) {
    const empty = document.createElement("p");
    empty.className = "conversations__empty";
    empty.textContent = "No conversations yet.";
    conversationsEl.appendChild(empty);
    return;
  }

  for (const conv of conversations) {
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
    conversationsEl.appendChild(row);
  }
}

async function loadConversations() {
  const res = await fetch("/api/conversations");
  if (!res.ok) return;
  const data = await res.json();
  renderConversations(data.conversations);
}

async function openTranscript(id, archetypeA, archetypeB) {
  const res = await fetch(`/api/conversations/${id}`);
  if (!res.ok) return;
  const data = await res.json();

  transcriptTitle.textContent = `${archetypeA} ↔ ${archetypeB}`;
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

    speakerRow.append(speaker, time);

    const message = document.createElement("p");
    message.className = "transcript-turn__message";
    message.textContent = turn.message;

    item.append(speakerRow, message);
    transcriptBody.appendChild(item);
  }

  transcriptOverlay.hidden = false;
}

transcriptClose.addEventListener("click", () => {
  transcriptOverlay.hidden = true;
});
transcriptOverlay.addEventListener("click", (e) => {
  if (e.target === transcriptOverlay) transcriptOverlay.hidden = true;
});

const INFO_CONTENT = {
  relationships: {
    title: "What are Relationships?",
    body: [
      "Each row is a running score between two agents — it moves up or down by 1 or 2 points after every tick, based on how one reacts to what the other just did or said.",
      "The bar is one scale centered on zero, not a comparison between the two names. Filling right (cyan) means positive/friendly; filling left (red) means negative/strained. The two names are just the pair — their left/right position doesn't mean anything, it's not \"who's winning.\"",
      "Every pair happens to be positive right now, which is why every bar fills the same direction — nothing has gone negative yet.",
    ],
  },
};

document.querySelectorAll(".info-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const content = INFO_CONTENT[btn.dataset.info];
    if (!content) return;
    infoTitle.textContent = content.title;
    infoBody.textContent = "";
    for (const paragraph of content.body) {
      const p = document.createElement("p");
      p.className = "info-paragraph";
      p.textContent = paragraph;
      infoBody.appendChild(p);
    }
    infoOverlay.hidden = false;
  });
});

infoClose.addEventListener("click", () => {
  infoOverlay.hidden = true;
});
infoOverlay.addEventListener("click", (e) => {
  if (e.target === infoOverlay) infoOverlay.hidden = true;
});

agentFocusClose.addEventListener("click", () => {
  agentFocusOverlay.hidden = true;
});
agentFocusOverlay.addEventListener("click", (e) => {
  if (e.target === agentFocusOverlay) agentFocusOverlay.hidden = true;
});

function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = text;
  toastStack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast--out");
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

async function loadWorld() {
  const res = await fetch("/api/world");
  if (!res.ok) throw new Error(`Failed to load world state (${res.status})`);
  const data = await res.json();
  renderAgents(data.agents, new Map(), data.worldState);
  renderRelationships(data.relationships);
  renderTimeline(data.worldState);
  await loadConversations();
}

async function runTick(eventDescription) {
  tickBtn.disabled = true;
  tickBtn.querySelector("span").textContent = "RUNNING…";
  try {
    const res = await fetch("/api/tick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: eventDescription }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Tick failed (${res.status})`);
    }
    const data = await res.json();

    const latestByKey = new Map(data.results.map((r) => [r.key, r]));

    const world = await (await fetch("/api/world")).json();
    renderAgents(world.agents, latestByKey, world.worldState);
    renderRelationships(world.relationships);
    renderTimeline(world.worldState);

    for (const key of latestByKey.keys()) {
      const card = agentsEl.querySelector(`[data-agent-key="${key}"]`);
      if (card) {
        card.classList.add("agent-card--flash");
        setTimeout(() => card.classList.remove("agent-card--flash"), 1200);
      }
    }

    if (data.conversation) {
      const { agentA, agentB } = data.conversation;
      showToast(`💬 ${agentA.archetype} and ${agentB.archetype} are talking`);
      await loadConversations();
    }
  } finally {
    tickBtn.disabled = false;
    tickBtn.querySelector("span").textContent = "RUN NEXT TICK";
  }
}

tickForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const eventDescription = eventInput.value.trim();
  eventInput.value = "";
  try {
    await runTick(eventDescription);
  } catch (err) {
    alert(err.message);
  }
});

loadWorld().catch((err) => {
  timelineEl.textContent = `Failed to load: ${err.message}`;
});

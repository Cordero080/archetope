// Entry point — the only file index.html loads directly (as a module).
// Everything else is imported from here or from each other. This file's job
// is top-level orchestration only: load the world, run a tick, wire the
// page-level controls (nav trigger, tick form). Each feature's own DOM refs,
// rendering, and local event listeners live in that feature's own file.

// ---------- IMPORTS ----------
import { renderAgents } from "./agentCards.js";
import { renderRelationships } from "./relationships.js";
import { renderTimeline, showTimelineError } from "./timeline.js";
import { loadConversations } from "./conversations.js";
import { showToast } from "./toast.js";

// ---------- CONFIG ----------
const agentsEl = document.getElementById("agents");
const tickForm = document.getElementById("tick-form");
const tickBtn = document.getElementById("tick-btn");
const eventInput = document.getElementById("event-input");
const navTrigger = document.getElementById("nav-trigger");
const topNavDrawer = document.getElementById("top-nav-drawer");

// ---------- MAIN ----------
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

// ---------- START ----------
navTrigger.addEventListener("click", () => {
  const open = topNavDrawer.classList.toggle("top-nav-drawer--open");
  navTrigger.classList.toggle("header-nav-trigger--open", open);
  navTrigger.setAttribute("aria-expanded", String(open));
});

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
  showTimelineError(err.message);
});

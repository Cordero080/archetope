// ---------- IMPORTS ----------
import {
  accentFor,
  formatRelativeTime,
  computeGlowIntensity,
} from "./helpers.js";
import { createVisualizeControl } from "./visualize.js";
import { createInsightControl } from "./insight.js";

// ---------- CONFIG ----------
const timelineEl = document.getElementById("timeline");

// ---------- HELPERS ----------
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

  const left = document.createElement("span");
  left.className = "timeline-entry__left";

  const node = document.createElement("span");
  node.className = "timeline-entry__node";
  node.style.setProperty(
    "--glow",
    computeGlowIntensity(createdAt ?? Date.now()),
  );
  node.title = `${formatRelativeTime(createdAt ?? Date.now())} — brighter means more recent`;

  const tag = document.createElement("span");
  tag.className = "timeline-entry__tag";
  tag.textContent = archetype || "world";

  left.append(node, tag);

  const time = document.createElement("span");
  time.className = "timeline-entry__time";
  time.textContent = formatRelativeTime(createdAt ?? Date.now());

  head.append(left, time);

  const text = document.createElement("span");
  text.textContent = description;

  item.append(head, text);
  if (id != null) {
    const controls = document.createElement("div");
    controls.className = "entry-controls";
    controls.appendChild(
      createVisualizeControl(id, {
        url: entry.image_url,
        prompt: entry.image_prompt,
        createdAt: entry.image_created_at,
      }),
    );
    if (archetype) {
      controls.appendChild(
        createInsightControl(id, text, description, {
          archetype,
          mbti: entry.mbti,
          targetSentence: entry.insight_target_sentence,
          arcanaNote: entry.insight_arcana_note,
          mbtiNote: entry.insight_mbti_note,
          stateNote: entry.insight_state_note,
        }),
      );
    }
    item.appendChild(controls);
  }
  timelineEl.appendChild(item);
}

// ---------- MAIN ----------
export function renderTimeline(worldState) {
  timelineEl.textContent = "";
  for (const entry of [...worldState].reverse()) {
    appendTimelineEntry(entry);
  }
}

export function showTimelineError(message) {
  timelineEl.textContent = `Failed to load: ${message}`;
}

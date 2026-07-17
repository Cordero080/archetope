import { accentFor, formatRelativeTime } from "./helpers.js";
import { createVisualizeControl } from "./visualize.js";
import { createInsightControl } from "./insight.js";
import { openInfoModal } from "./modal.js";
import { renderAgentFocusConversations } from "./conversations.js";

const agentsEl = document.getElementById("agents");
const agentFocusOverlay = document.getElementById("agent-focus-overlay");
const agentFocusTitle = document.getElementById("agent-focus-title");
const agentFocusTabs = document.getElementById("agent-focus-tabs");
const agentFocusBody = document.getElementById("agent-focus-body");
const agentFocusConversations = document.getElementById(
  "agent-focus-conversations",
);
const agentFocusClose = document.getElementById("agent-focus-close");

const MBTI_INFO = {
  ENTJ: {
    definition:
      "Extraverted, iNtuitive, Thinking, Judging — decisive, structural, quick to act on a plan, uncomfortable leaving a flawed system unaddressed.",
    reasoning:
      "Assigned strategically, not by accident: Te-dominant decisiveness gives the Tower's light (necessary revelation) real teeth, and is exactly what makes its shadow (destruction for its own sake) dangerous — conviction without the brake of Fi. It was chosen specifically to set up a built-in opposite to the Hierophant's ISTJ.",
  },
  ISTJ: {
    definition:
      "Introverted, Sensing, Thinking, Judging — methodical, precedent-minded, trusts what's already proven over what's new.",
    reasoning:
      "Assigned strategically: Si-dominant reverence for precedent is the direct opposite of the Tower's Te-Ne disruption. Tower vs. Hierophant is revolutionary vs. institution-builder by construction, not flavor text — the MBTI pairing is what makes that conflict structural instead of just written-in.",
  },
  INFP: {
    definition:
      "Introverted, iNtuitive, Feeling, Perceiving — idealistic, guided by personal values felt deeply rather than argued.",
    reasoning:
      "Assigned strategically, as the group's values-conscience: Fi-dominant idealism makes hope and healing a felt identity, not a performance. Its shadow (martyrdom, naive self-sacrifice) is the classic INFP failure mode — over-giving from identity rather than strategy.",
  },
  ENTP: {
    definition:
      "Extraverted, iNtuitive, Thinking, Perceiving — sees possibility everywhere, quick to prototype, energized by clever combinations.",
    reasoning:
      "Assigned strategically to give the group a builder who moves faster than consensus: Ne-dominant delight in possibility is what makes the Magician build immediately. Its shadow (manipulation) is that same Ne-Ti energy unmoored from Fe — persuasion used instrumentally instead of honestly.",
  },
  ESTJ: {
    definition:
      "Extraverted, Sensing, Thinking, Judging — commanding, practical, organizes people and resources toward a concrete result and expects it to hold.",
    reasoning:
      "Assigned strategically to create a third, distinct kind of authority: Te-Si enforcement in the present, not out of reverence for the past (that's Hierophant's role) but because someone has to hold the line right now. Distinct from Hierophant's passive precedent-reverence and Tower's revolutionary instinct.",
  },
};

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
      const controls = document.createElement("div");
      controls.className = "entry-controls";
      controls.appendChild(
        createVisualizeControl(entry.id, {
          url: entry.image_url,
          prompt: entry.image_prompt,
          createdAt: entry.image_created_at,
        }),
      );
      controls.appendChild(
        createInsightControl(entry.id, text, entry.description, {
          archetype: agent.archetype,
          mbti: agent.mbti,
          targetSentence: entry.insight_target_sentence,
          arcanaNote: entry.insight_arcana_note,
          mbtiNote: entry.insight_mbti_note,
          stateNote: entry.insight_state_note,
        }),
      );
      li.appendChild(controls);
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

  renderAgentFocusConversations(agent);

  // Always reopen on the Profile tab, regardless of which tab was active
  // last time this modal was open (for this agent or a different one).
  agentFocusTabs
    .querySelectorAll(".agent-focus-tab")
    .forEach((tab) =>
      tab.classList.toggle(
        "agent-focus-tab--active",
        tab.dataset.tab === "profile",
      ),
    );
  agentFocusBody.hidden = false;
  agentFocusConversations.hidden = true;

  agentFocusOverlay.hidden = false;
}

export function renderAgents(agents, latestByKey = new Map(), worldState = []) {
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

    const mbti = document.createElement("button");
    mbti.type = "button";
    mbti.className = "agent-card__mbti agent-card__mbti--clickable";
    mbti.textContent = agent.mbti;
    mbti.addEventListener("click", () => {
      const info = MBTI_INFO[agent.mbti];
      if (!info) return;
      openInfoModal(`${agent.mbti} - ${agent.archetype}`, [
        info.definition,
        info.reasoning,
      ]);
    });

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

agentFocusClose.addEventListener("click", () => {
  agentFocusOverlay.hidden = true;
});
agentFocusOverlay.addEventListener("click", (e) => {
  if (e.target === agentFocusOverlay) agentFocusOverlay.hidden = true;
});

// One listener for both tab buttons (event delegation) rather than
// re-attaching a listener every time openAgentFocus runs — the buttons are
// static HTML, they only need wiring once.
agentFocusTabs.addEventListener("click", (e) => {
  const tab = e.target.closest(".agent-focus-tab");
  if (!tab) return;

  agentFocusTabs
    .querySelectorAll(".agent-focus-tab")
    .forEach((t) => t.classList.toggle("agent-focus-tab--active", t === tab));

  const showProfile = tab.dataset.tab === "profile";
  agentFocusBody.hidden = !showProfile;
  agentFocusConversations.hidden = showProfile;
});

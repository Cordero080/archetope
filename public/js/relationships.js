// ---------- IMPORTS ----------
import { openInfoModal } from "./modal.js";

// ---------- CONFIG ----------
const relationshipsEl = document.getElementById("relationships");

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

// ---------- MAIN ----------
export function renderRelationships(relationships) {
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

// ---------- START ----------
document.querySelectorAll(".info-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const content = INFO_CONTENT[btn.dataset.info];
    if (!content) return;
    openInfoModal(content.title, content.body);
  });
});

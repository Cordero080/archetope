// Opt-in "why did they say that" insight (💡 Explain).

// ---------- IMPORTS ----------
import { openInfoModal } from "./modal.js";

// ---------- HELPERS ----------
// Wraps the matched substring in a clickable highlight, splitting the
// surrounding plain text around it. Returns the highlight span, or null if
// the model's quoted sentence isn't an exact substring of the real text
// (falls back to leaving the text untouched rather than breaking it).
function highlightSentenceInElement(textEl, fullText, targetSentence) {
  const idx = targetSentence ? fullText.indexOf(targetSentence) : -1;
  if (idx === -1) return null;

  textEl.textContent = "";
  const before = fullText.slice(0, idx);
  const match = fullText.slice(idx, idx + targetSentence.length);
  const after = fullText.slice(idx + targetSentence.length);

  if (before) textEl.appendChild(document.createTextNode(before));
  const mark = document.createElement("span");
  mark.className = "insight-highlight";
  mark.textContent = match;
  textEl.appendChild(mark);
  if (after) textEl.appendChild(document.createTextNode(after));
  return mark;
}

function showInsightModal(data) {
  openInfoModal(`${data.archetype} (${data.mbti})`, [
    `“${data.targetSentence}”`,
    `Arcana: ${data.arcanaNote}`,
    `MBTI: ${data.mbtiNote}`,
    `State: ${data.stateNote}`,
  ]);
}

// ---------- MAIN ----------
// Opt-in "why did they say that" control, same cached-forever pattern as
// createVisualizeControl. `existing` pre-fills from data already saved in
// a past session (from /api/world), so a page reload doesn't need a click
// to show an insight that was already generated.
export function createInsightControl(
  worldStateId,
  textEl,
  fullText,
  existing = {},
) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "insight-btn";
  btn.textContent = "💡 Explain";

  let insightData = null;

  function applyData(data) {
    insightData = data;
    const mark = highlightSentenceInElement(
      textEl,
      fullText,
      data.targetSentence,
    );
    if (mark)
      mark.addEventListener("click", () => showInsightModal(insightData));
    btn.textContent = mark ? "💡 Insight" : "💡 Explain (no exact match)";
  }

  if (existing.targetSentence) applyData(existing);

  btn.addEventListener("click", async () => {
    if (insightData) {
      showInsightModal(insightData);
      return;
    }

    btn.disabled = true;
    btn.textContent = "Thinking…";
    try {
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worldStateId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }
      const data = await res.json();
      applyData(data);
      showInsightModal(data);
    } catch (err) {
      btn.textContent = "💡 Explain";
      alert(err.message);
    } finally {
      btn.disabled = false;
    }
  });

  return btn;
}

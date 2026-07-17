// Generic info modal — reused by the insight feature, MBTI info, and the
// relationships panel's info button. Owns its own DOM refs and its own
// close-button/backdrop-click wiring, so everything about "how this modal
// works" lives in one file.

const infoOverlay = document.getElementById("info-overlay");
const infoTitle = document.getElementById("info-title");
const infoBody = document.getElementById("info-body");
const infoClose = document.getElementById("info-close");

export function openInfoModal(title, paragraphs) {
  infoTitle.textContent = title;
  infoBody.textContent = "";
  for (const paragraph of paragraphs) {
    const p = document.createElement("p");
    p.className = "info-paragraph";
    p.textContent = paragraph;
    infoBody.appendChild(p);
  }
  infoOverlay.hidden = false;
}

infoClose.addEventListener("click", () => {
  infoOverlay.hidden = true;
});
infoOverlay.addEventListener("click", (e) => {
  if (e.target === infoOverlay) infoOverlay.hidden = true;
});

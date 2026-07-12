const ACCENTS = {
  tower: "var(--c-tower)",
  hierophant: "var(--c-hierophant)",
  star: "var(--c-star)",
  magician: "var(--c-magician)",
};

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

const galleryEl = document.getElementById("gallery");

function renderGallery(images) {
  galleryEl.textContent = "";

  if (images.length === 0) {
    const empty = document.createElement("p");
    empty.className = "gallery-empty";
    empty.textContent =
      "No images generated yet — click “🎨 Visualize” on any World State or agent History entry to create one.";
    galleryEl.appendChild(empty);
    return;
  }

  for (const image of images) {
    const card = document.createElement("article");
    card.className = "gallery-card";
    card.style.setProperty("--agent-color", accentFor(image.agent_key));

    const img = document.createElement("img");
    img.className = "gallery-card__image";
    img.src = image.url;
    img.alt = image.prompt;

    const body = document.createElement("div");
    body.className = "gallery-card__body";

    const head = document.createElement("div");
    head.className = "gallery-card__head";

    const tag = document.createElement("span");
    tag.className = "gallery-card__tag";
    tag.textContent = image.archetype || "world";

    const time = document.createElement("span");
    time.className = "gallery-card__time";
    time.textContent = formatRelativeTime(image.created_at);

    head.append(tag, time);

    const context = document.createElement("p");
    context.className = "gallery-card__context";
    context.textContent = image.description;

    const prompt = document.createElement("p");
    prompt.className = "gallery-card__prompt";
    prompt.textContent = image.prompt;

    body.append(head, context, prompt);
    card.append(img, body);
    galleryEl.appendChild(card);
  }
}

async function loadGallery() {
  const res = await fetch("/api/gallery");
  if (!res.ok) throw new Error(`Failed to load gallery (${res.status})`);
  const data = await res.json();
  renderGallery(data.images);
}

loadGallery().catch((err) => {
  galleryEl.textContent = `Failed to load: ${err.message}`;
});

// Opt-in "🎨 Visualize" control: only fires the (paid) image API when the
// user explicitly clicks it, never automatically. Shared by World State
// entries and the per-agent History dropdown, since both list the same
// underlying world_state rows. If `existing` already has a url (this entry
// was visualized before, in any past session), the image is already saved
// server-side — clicking just reveals it, no API call and no cost.

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

export function createVisualizeControl(worldStateId, existing = {}) {
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

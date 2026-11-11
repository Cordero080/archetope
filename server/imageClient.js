// Turns a world_state entry into an image, entirely opt-in (triggered by a
// user click, never automatically). Two calls: Claude crafts a concrete
// visual prompt from the agent's own words, then OpenAI's image API renders it.

// ---------- IMPORTS ----------
import "dotenv/config";
import { anthropic, MODEL } from "./agentClient.js";

// ---------- CONFIG ----------
const IMAGE_MODEL = "gpt-image-1";

const PROMPT_SYSTEM = `You turn a short description of an action into a vivid, concrete visual prompt for an image generator. Depict the scene literally, using only what the description actually says for the setting, tools, and technology. Do NOT add mythic, medieval, ruined, apocalyptic, or tarot-symbolic atmosphere — no crumbling towers, ancient stone, hooded robes, storms, or ruins — unless the description explicitly says so.

Default aesthetic for any figure in the scene: minimal cyberpunk, not an ordinary person in office/casual clothing — no flannels, cardigans, polos, or business-casual. Sleek, minimal, form-fitting technical gear instead. Skin can show subtle bioluminescent accents or fine glowing circuitry/meridian-like energy lines beneath the surface, as if the body itself is technologically or energetically augmented — still humanoid and grounded in plausible physics, this is stylized biotech realism, not fantasy or magic. Lighting should lean moody and high-contrast, lit by practical sources (screens, panels, the glowing lines themselves) rather than flat daylight. Give each figure a specific, memorable presence — distinctive, not a placeholder model.

Output ONLY the image prompt itself — one or two sentences describing the physical scene: setting, objects, composition, lighting. No text or words should appear in the image. Style: photorealistic, minimal cyberpunk.`;

// ---------- HELPERS ----------
async function craftImagePrompt(description) {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 150,
    system: PROMPT_SYSTEM,
    messages: [{ role: "user", content: description }],
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

// ---------- MAIN ----------
export async function generateImage(description) {
  const prompt = await craftImagePrompt(description);

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      size: "1024x1024",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Image generation failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const image = data.data?.[0];
  if (!image) throw new Error("No image returned");

  return {
    prompt,
    b64: image.b64_json ?? null,
    url: image.url ?? null,
  };
}

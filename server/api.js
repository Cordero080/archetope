// Tiny REST API + static file server for the Archetope viewer UI.
// GET /api/world     — current agents, world-state timeline, relationship sentiment
// POST /api/tick      — fires a new event, runs one tick, returns each agent's reply
// POST /api/visualize — generates (or returns the already-saved) image for a world_state entry
// GET /api/gallery    — every image ever generated, with context, for the gallery page
import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { query } from "./db.js";
import { tick } from "./orchestrator.js";
import { generateImage } from "./imageClient.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const GENERATED_DIR = path.join(PUBLIC_DIR, "generated");
await fs.mkdir(GENERATED_DIR, { recursive: true });

const app = express();

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

app.get("/api/world", async (_req, res) => {
  try {
    const { rows: agents } = await query(
      "SELECT id, key, archetype, mbti, current_state FROM agents ORDER BY id",
    );
    const { rows: worldState } = await query(
      `SELECT ws.id, ws.description, ws.created_at, ws.state, a.key AS agent_key, a.archetype,
              gi.file_path AS image_path, gi.prompt AS image_prompt,
              gi.created_at AS image_created_at
       FROM world_state ws
       LEFT JOIN agents a ON a.id = ws.built_by
       LEFT JOIN generated_images gi ON gi.world_state_id = ws.id
       ORDER BY ws.created_at ASC`,
    );
    const { rows: relRows } = await query("SELECT * FROM relationships");

    const agentsById = new Map(agents.map((a) => [a.id, a]));
    const relationships = relRows.map((r) => ({
      a: agentsById.get(r.agent_a_id)?.archetype,
      b: agentsById.get(r.agent_b_id)?.archetype,
      sentiment: r.sentiment,
    }));

    res.json({
      agents,
      relationships,
      worldState: worldState.map((row) => ({
        ...row,
        image_url: row.image_path ? `/${row.image_path}` : null,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tick", async (req, res) => {
  try {
    const eventDescription =
      String(req.body?.event ?? "").trim() ||
      "A new moment passes in the world.";
    const result = await tick(eventDescription);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/conversations", async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.started_at, a.archetype AS archetype_a, b.archetype AS archetype_b,
              (SELECT message FROM conversation_turns t
               WHERE t.conversation_id = c.id ORDER BY t.turn_index DESC LIMIT 1) AS last_message,
              (SELECT COUNT(*)::int FROM conversation_turns t WHERE t.conversation_id = c.id) AS turn_count
       FROM conversations c
       JOIN agents a ON a.id = c.agent_a_id
       JOIN agents b ON b.id = c.agent_b_id
       ORDER BY c.started_at DESC
       LIMIT 20`,
    );
    res.json({ conversations: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/conversations/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rows: turns } = await query(
      `SELECT t.turn_index, t.message, t.created_at, a.key AS agent_key, a.archetype
       FROM conversation_turns t
       JOIN agents a ON a.id = t.agent_id
       WHERE t.conversation_id = $1
       ORDER BY t.turn_index ASC`,
      [id],
    );
    if (turns.length === 0) return res.status(404).json({ error: "Not found" });
    res.json({ id, turns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/visualize", async (req, res) => {
  try {
    const worldStateId = Number(req.body?.worldStateId);

    // Already generated for this entry — return the saved one, never
    // re-spend tokens/image credits on a repeat click.
    const { rows: existing } = await query(
      `SELECT file_path, prompt, created_at FROM generated_images WHERE world_state_id = $1`,
      [worldStateId],
    );
    if (existing.length > 0) {
      const img = existing[0];
      return res.json({
        url: `/${img.file_path}`,
        prompt: img.prompt,
        createdAt: img.created_at,
        cached: true,
      });
    }

    const { rows } = await query(
      `SELECT description, built_by FROM world_state WHERE id = $1`,
      [worldStateId],
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });

    const { description, built_by } = rows[0];
    const image = await generateImage(description);
    if (!image.b64) throw new Error("Image service did not return image data");

    const filename = `${crypto.randomUUID()}.png`;
    const filePath = `generated/${filename}`;
    await fs.writeFile(
      path.join(GENERATED_DIR, filename),
      Buffer.from(image.b64, "base64"),
    );

    const { rows: inserted } = await query(
      `INSERT INTO generated_images (world_state_id, agent_id, prompt, file_path)
       VALUES ($1, $2, $3, $4)
       RETURNING created_at`,
      [worldStateId, built_by, image.prompt, filePath],
    );

    res.json({
      url: `/${filePath}`,
      prompt: image.prompt,
      createdAt: inserted[0].created_at,
      cached: false,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/gallery", async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT gi.id, gi.file_path, gi.prompt, gi.created_at,
              ws.description, a.archetype, a.key AS agent_key
       FROM generated_images gi
       JOIN world_state ws ON ws.id = gi.world_state_id
       LEFT JOIN agents a ON a.id = gi.agent_id
       ORDER BY gi.created_at DESC`,
    );
    res.json({
      images: rows.map((r) => ({ ...r, url: `/${r.file_path}` })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Archetope running at http://localhost:${PORT}`);
});

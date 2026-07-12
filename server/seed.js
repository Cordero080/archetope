// Idempotently seeds the 4 MVP agents + their relationship rows, seeds the
// initial (empty) world state if it doesn't exist yet, then fires one
// seeded event and runs a tick. Safe to re-run.
import { query, pool } from "./db.js";
import { AGENTS } from "./identities.js";
import { tick } from "./orchestrator.js";

const SEED_EVENT =
  "The agents awaken in an empty world with abundant raw materials and no rules. Nothing has been built yet.";

async function seedAgents() {
  const ids = {};
  for (const agent of AGENTS) {
    const { rows } = await query(
      `INSERT INTO agents (key, archetype, mbti, identity_block, current_state)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (key) DO UPDATE SET
         archetype = EXCLUDED.archetype,
         mbti = EXCLUDED.mbti,
         identity_block = EXCLUDED.identity_block
       RETURNING id`,
      [
        agent.key,
        agent.archetype,
        agent.mbti,
        agent.identityBlock,
        agent.startingState,
      ],
    );
    ids[agent.key] = rows[0].id;
  }
  return ids;
}

async function seedRelationships(ids) {
  const keys = Object.keys(ids);
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const [a, b] = [ids[keys[i]], ids[keys[j]]].sort((x, y) => x - y);
      await query(
        `INSERT INTO relationships (agent_a_id, agent_b_id, sentiment)
         VALUES ($1, $2, 0)
         ON CONFLICT (agent_a_id, agent_b_id) DO NOTHING`,
        [a, b],
      );
    }
  }
}

async function seedWorldState() {
  const { rows } = await query("SELECT COUNT(*)::int AS n FROM world_state");
  if (rows[0].n > 0) return;
  await query(
    `INSERT INTO world_state (description, built_by) VALUES ($1, NULL)`,
    ["An empty world. Abundant raw materials. No rules. Nothing built yet."],
  );
}

async function main() {
  console.log("Seeding agents...");
  const ids = await seedAgents();
  console.log("Seeding relationships...");
  await seedRelationships(ids);
  console.log("Seeding initial world state...");
  await seedWorldState();

  console.log("Running seed tick...\n");
  await tick(SEED_EVENT);
}

main()
  .catch((err) => {
    console.error("Seed run failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

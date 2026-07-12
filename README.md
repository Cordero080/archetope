# Archetope

Multi-agent emergent society simulation. Agents grounded in a tarot
archetype, an MBTI type, and a Jungian shadow are dropped into an empty
shared world and left to build a civilization one event-driven tick at a
time.

This is the MVP: 4 agents, one seeded event, one tick, console/log output.

## Files

- `archetope-reference.md` — the 22 Major Arcana (light + shadow), and MBTI
  justification for the 4 MVP agents. Human-readable reference; source of
  truth for archetype meanings.
- `db/schema.sql` — Postgres schema: `agents`, `relationships`,
  `world_state` (append-only build log), `memory` (rolling per-agent
  summaries), `events`.
- `db/migrate.js` — applies `schema.sql` against `DATABASE_URL`. Re-runnable.
- `server/identities.js` — fixed identity layer: the 4 agents' compressed
  system-prompt blocks (archetype + MBTI + light/shadow) plus the shared
  JSON-response instructions appended to every call.
- `server/db.js` — shared Postgres connection pool.
- `server/agentClient.js` — makes one Anthropic API call per agent, with its
  identity as the system prompt and current world/relationship/memory
  context as the user message. Parses the model's JSON reply.
- `server/orchestrator.js` — the tick loop: fires an event, wakes relevant
  agents (MVP: all of them), collects each agent's in-character response,
  and writes the results back to `world_state`, `relationships`, and
  `memory`. Agents only see world state as of *before* the tick — they
  never message each other directly (stigmergy), and only perceive each
  other's actions on a later tick.
- `server/seed.js` — idempotently seeds the 4 agents and their relationship
  rows, seeds the initial empty world state, then fires the seed event and
  runs one tick.

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and ANTHROPIC_API_KEY
createdb archetope     # or point DATABASE_URL at an existing db
npm run migrate
npm run seed
```

`npm run seed` prints each agent's in-character proposal for the seed event
("agents awaken in an empty world with abundant raw materials and no
rules"), plus any relationship shifts, to the console.

## The 4 MVP agents

| Archetype | MBTI | Light | Shadow |
|---|---|---|---|
| The Tower | ENTJ | necessary revelation | destruction for its own sake |
| The Hierophant | ISTJ | tradition, wisdom | dogma, control |
| The Star | INFP | hope, healing | martyrdom, false hope |
| The Magician | ENTP | manifestation, tool-building | manipulation, deception |

Tower vs. Hierophant is built-in conflict (revolutionary vs.
institution-builder). See `archetope-reference.md` for full MBTI reasoning.

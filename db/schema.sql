-- Archetope MVP schema.
-- Relational because agent-to-agent relationships need to be queryable
-- (sentiment lookups, history joins) in ways a document store makes awkward.

CREATE TABLE IF NOT EXISTS agents (
  id              SERIAL PRIMARY KEY,
  key             TEXT UNIQUE NOT NULL,        -- short handle, e.g. 'tower'
  archetype       TEXT NOT NULL,                -- e.g. 'The Tower'
  mbti            TEXT NOT NULL,                -- e.g. 'ENTJ'
  identity_block  TEXT NOT NULL,                -- compressed system-prompt text
  current_state   TEXT NOT NULL DEFAULT 'light' CHECK (current_state IN ('light', 'shadow')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per unordered agent pair. agent_a_id < agent_b_id is enforced
-- at the application layer so each pair has exactly one row.
CREATE TABLE IF NOT EXISTS relationships (
  id             SERIAL PRIMARY KEY,
  agent_a_id     INTEGER NOT NULL REFERENCES agents(id),
  agent_b_id     INTEGER NOT NULL REFERENCES agents(id),
  sentiment      INTEGER NOT NULL DEFAULT 0,    -- running score, roughly -10..10
  history        JSONB NOT NULL DEFAULT '[]',   -- [{event_id, delta, reason, at}]
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_a_id, agent_b_id),
  CHECK (agent_a_id < agent_b_id)
);

CREATE TABLE IF NOT EXISTS events (
  id           SERIAL PRIMARY KEY,
  description  TEXT NOT NULL,
  fired_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only log of what's been built/decided. The "current world state"
-- is the concatenation of these entries in order, not a single mutable row —
-- this keeps a full audit trail of how the world got where it is.
CREATE TABLE IF NOT EXISTS world_state (
  id           SERIAL PRIMARY KEY,
  description  TEXT NOT NULL,
  built_by     INTEGER REFERENCES agents(id),   -- NULL for seed/system entries
  event_id     INTEGER REFERENCES events(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Snapshot of the agent's light/shadow state at the moment of this entry,
-- so a shadow-lean trend can be computed from history. NULL on old rows
-- from before this column existed.
ALTER TABLE world_state ADD COLUMN IF NOT EXISTS state TEXT CHECK (state IN ('light', 'shadow'));

-- Rolling memory per agent. MVP stores one summary row per tick per agent
-- rather than full transcripts, to keep future prompts cheap.
CREATE TABLE IF NOT EXISTS memory (
  id          SERIAL PRIMARY KEY,
  agent_id    INTEGER NOT NULL REFERENCES agents(id),
  event_id    INTEGER REFERENCES events(id),
  summary     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_agent ON memory(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relationships_a ON relationships(agent_a_id);
CREATE INDEX IF NOT EXISTS idx_relationships_b ON relationships(agent_b_id);

-- A direct, turn-taking exchange between two agents — distinct from
-- world_state (which is what got built) and memory (each agent's private
-- rolling summary). One row per conversation; turns live in conversation_turns.
CREATE TABLE IF NOT EXISTS conversations (
  id           SERIAL PRIMARY KEY,
  event_id     INTEGER REFERENCES events(id),
  agent_a_id   INTEGER NOT NULL REFERENCES agents(id),
  agent_b_id   INTEGER NOT NULL REFERENCES agents(id),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_turns (
  id               SERIAL PRIMARY KEY,
  conversation_id  INTEGER NOT NULL REFERENCES conversations(id),
  agent_id         INTEGER NOT NULL REFERENCES agents(id),
  turn_index       INTEGER NOT NULL,
  message          TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_turns_conv ON conversation_turns(conversation_id, turn_index);

ALTER TABLE conversation_turns ADD COLUMN IF NOT EXISTS tone TEXT CHECK (tone IN ('conflict', humor', 'friendly'));

-- One generated image per world_state entry, permanently. UNIQUE constraint
-- means a click on an already-visualized entry can never trigger a second
-- (paid) generation — the API just returns the saved row.
CREATE TABLE IF NOT EXISTS generated_images (
  id              SERIAL PRIMARY KEY,
  world_state_id  INTEGER NOT NULL UNIQUE REFERENCES world_state(id),
  agent_id        INTEGER REFERENCES agents(id),
  prompt          TEXT NOT NULL,
  file_path       TEXT NOT NULL,   -- relative to public/, e.g. "generated/<uuid>.png"
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One "why did they say that" annotation per world_state entry, generated
-- on demand (never automatically) and cached permanently like
-- generated_images — a second click never re-spends tokens. Written by a
-- separate analysis call that reads the *finished* text, not by the agent
-- narrating itself while writing it.
CREATE TABLE IF NOT EXISTS insights (
  id              SERIAL PRIMARY KEY,
  world_state_id  INTEGER NOT NULL UNIQUE REFERENCES world_state(id),
  target_sentence TEXT NOT NULL,   -- verbatim substring of the entry's description
  arcana_note     TEXT NOT NULL,
  mbti_note       TEXT NOT NULL,
  state_note      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

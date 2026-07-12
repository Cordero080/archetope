# Archetope

A multi-agent society simulation. Four Claude-driven agents — each grounded
in a tarot archetype, an MBTI type, and a Jungian shadow — share an empty
world and build in it, tick by tick, with real memory, evolving relationships,
and both indirect (stigmergy) and direct (conversation) interaction.

Each agent arrives as a pure archetype but carries full 2026 knowledge —
they reach for load cells, powered tools, and shared spec docs, not sticks
and stones, and will self-correct out loud if they catch themselves
defaulting to something primitive.

## What this is actually testing

The underlying question: do small, fixed personality differences (an
archetype's light/shadow poles crossed with an MBTI cognitive style) produce
*distinguishable, consistent* group dynamics once agents have persistent
memory, a running relationship score with each other, and a shared world
they can see the history of — without ever being told what conflict to have?

What's actually shown up so far, running it:

- **A stable, unscripted rivalry.** The Tower (ENTJ, revolutionary/testing
  instinct) and The Hierophant (ISTJ, institution-builder) consistently
  pull in different directions — Tower wants to verify the ground before
  anyone commits to it, Hierophant wants to canonize the first working
  result into a repeatable standard. Nobody wrote that conflict into the
  code; it falls out of the archetype + MBTI pairing.
- **Escalating, self-directed scope.** Left alone, the group's build target
  drifted on its own from "sort raw materials" → "build a platform" →
  "raise walls" → "build an aircraft" → "consider a spacetime-bending
  drive" — with no external prompting pushing it there.
- **Emergent process-conflict.** The Star (INFP) independently started
  challenging the group for building bigger and bigger things without ever
  agreeing on *why* — refusing to let the group fabricate exotic drive
  components until everyone actually named the goal out loud. That's the
  Star archetype's light/shadow tension (hope and vision vs. martyrdom/being
  ignored) showing up as a believable, specific in-context objection, not a
  generic disagreement.
- **A visible bias worth knowing about.** The image-generation step (see
  below) defaulted to rendering a moody, medieval/apocalyptic mood — a
  hooded figure in ruins under lightning — even when the underlying text
  was already fully modern ("testing weight, strength, flexibility"). That
  bias came from the image-prompting step's own initiative, not the agents'
  actual words. It's a reminder that a system built from tarot archetypes
  will lean mythic by default in every layer unless each layer is
  explicitly told not to — worth watching for if you extend this further.

None of this was hand-scripted per-scenario; it's what happened running the
actual tick loop and reading the actual output.

## Running it

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL, ANTHROPIC_API_KEY, OPENAI_API_KEY
createdb archetope        # or point DATABASE_URL at an existing db
npm run migrate
npm run seed               # seeds the 4 agents + fires the first tick (console output)
npm start                  # serves the web app at http://localhost:3001
```

`OPENAI_API_KEY` is only needed if you want to use the image-generation
feature (see below) — everything else works without it.

The web app is the primary way to use this now: a live dashboard with a
"Run Next Tick" button, not just a one-shot console script.

## What the web app shows

- **Agents** — one card per archetype: current light/shadow state, a
  shadow-lean bar showing what fraction of their last 5 ticks were shadow,
  their latest proposal + reasoning, and a collapsible full history. Click
  the ⤢ icon to open a large focus view of any card.
- **Relationships** — a running sentiment score between every pair of
  agents, shown as a centered bar (right = positive, left = negative). Has
  an (?) info popover explaining the scale.
- **Conversations** — unlike the world-building ticks, which are pure
  stigmergy (agents only ever react to the aggregated world-state log, never
  to each other directly), each tick also runs one direct, turn-taking
  conversation between two agents who actually read and reply to each
  other's exact words. Click any conversation to read the full transcript.
- **World State** — the full, chronological build log, every agent's
  action from every tick.
- **Image generation (opt-in)** — click "🎨 Visualize" on any World State or
  History entry to have Claude craft a visual prompt from that entry and
  OpenAI render it. Entirely opt-in (nothing generates automatically), and
  permanently cached per entry — a second click never re-spends tokens or
  image credits, it just shows the saved image.
- **Gallery** (`gallery.html`) — every image ever generated, in one place,
  with its archetype, timestamp, and original context.

## Architecture

```
db/
  schema.sql        Postgres schema (agents, relationships, world_state,
                     memory, events, conversations, conversation_turns,
                     generated_images)
  migrate.js        applies schema.sql against DATABASE_URL, idempotent

server/
  identities.js     the 4 agents' system prompts: archetype + MBTI + shared
                     instructions (modern plain language, 2026 tech-awareness,
                     concreteness — no vague busywork, no archaic phrasing)
  agentClient.js    one Anthropic API call per agent; parses the structured
                     JSON reply, with a resilient fallback if a reply gets
                     truncated
  orchestrator.js   the tick loop — fires an event, collects each agent's
                     stigmergic reaction, writes world_state/relationships/
                     memory, then runs one direct conversation between two
                     agents per tick
  conversation.js   turn-taking dialogue between two agents — each sees the
                     other's actual words, not just the aggregated log
  imageClient.js    crafts a visual prompt from a world_state entry (Claude),
                     then generates the image (OpenAI)
  api.js            the REST API + static file server for the web app
  db.js             shared Postgres pool
  seed.js           idempotent one-time seed + first tick (console script)

public/
  index.html/app.js/style.css   the live dashboard
  gallery.html/gallery.js       the generated-image gallery
  fonts/                        self-hosted display font for the wordmark
```

## The 4 MVP agents

| Archetype | MBTI | Light | Shadow |
|---|---|---|---|
| The Tower | ENTJ | necessary revelation | destruction for its own sake |
| The Hierophant | ISTJ | tradition, wisdom | dogma, control |
| The Star | INFP | hope, healing | martyrdom, false hope |
| The Magician | ENTP | manifestation, tool-building | manipulation, deception |

Tower vs. Hierophant is built-in conflict (revolutionary vs.
institution-builder). See `archetope-reference.md` for the full 22-arcana
reference and MBTI reasoning.

## What's next

See `docs/STRETCH_GOALS.md` for the known architectural gaps — most
notably the relationship model, which is currently a single running scalar
and has gone stale (no decay, no texture, and it ignores history data
already being collected in the database).

`docs/design-notes/` records specific design decisions and the reasoning
behind them, for anyone extending this later — starting with why exotic,
physics-defying technology has to be *earned* through concrete prerequisites
rather than just declared into existence.

# Archetope

A social-science experiment: what happens when you give autonomous LLM
agents fixed, distinct personalities and let them build a shared world
together, tick by tick, with real memory and evolving relationships?

The personality source is Jungian archetypal psychology. Carl Jung
theorized a set of recurring archetypal patterns in the human psyche — the
Self, the Shadow, the Trickster, the Wise Elder, and so on. The tarot's 22
Major Arcana are a long-recognized symbolic catalog of that same territory:
a pre-built, culturally legible taxonomy of human archetypal roles, each
with a constructive ("light") and a corrupted ("shadow") expression. This
project uses that catalog as fixed personality scaffolding. Each archetype
is additionally cross-referenced with a Myers-Briggs (MBTI) cognitive-style
type, which supplies the more modern, specific "how this personality
actually processes and decides" layer on top of the archetype's broader
"what this personality values" layer.

Every agent also carries full 2026 knowledge — they reach for load cells,
powered tools, and shared spec docs, and will self-correct out loud if they
catch themselves defaulting to something primitive.

## What this is actually testing

The underlying question: do small, fixed personality differences (an
archetype's light/shadow poles crossed with an MBTI cognitive style) produce
_distinguishable, consistent_ group dynamics once agents have persistent
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
  agreeing on _why_ — refusing to let the group fabricate exotic drive
  components until everyone actually named the goal out loud. That's the
  Star archetype's light/shadow tension (hope and vision vs. martyrdom/being
  ignored) showing up as a believable, specific in-context objection.
- **A new kind of authority, once the Emperor joined.** Adding a 5th agent
  (ESTJ) produced the first negative relationship shift of the whole
  project — the Emperor docked the Magician for repeatedly advancing past
  an agreed safety checkpoint, and installed a physical kill-switch before
  letting the group continue. That's an active-authority dynamic distinct
  from the Hierophant's passive precedent-reverence, and it wasn't designed
  in beyond "give this archetype a light/shadow and an MBTI" — the specific
  behavior (safety gating, docking a peer's trust) emerged on its own.
- **An important caveat about all of the above.** For a meaningful stretch
  of this project, a real bug meant each agent's actual personality
  description was never being delivered to the model at all — a naming
  mismatch (`identityBlock` vs. the database's `identity_block`) silently
  sent the literal text `"undefined"` in place of the identity, for every
  tick and every conversation. Everything described above still happened.
  What the model had to work with instead was indirect: archetype-labeled
  entries in the shared world-state log, and each agent's own accumulating
  memory of what it had previously said — enough, apparently, for a capable
  model to infer and hold a consistent identity even without being told it
  directly. Once the bug was found and fixed, and each agent was given an
  explicit, distinct VOICE (sentence rhythm, directness, hedging) and a
  specific branch of HUMOR — a genuinely different comedic register per
  archetype: deadpan, dry literalism, bittersweet whimsy, sardonic wit — the
  differentiation became sharper and immediate rather than emergent-over-time.
  Worth knowing if you
  extend this: the system is more robust to this kind of failure than
  expected, but the explicit identity clearly still matters.
- **A visible bias worth knowing about, now fixed twice.** The image
  generation step's own prompt-crafting call (separate from the agents'
  actual words) defaulted first to a moody medieval/mythic look — a hooded
  figure in ruins under lightning — regardless of how modern the underlying
  text was, then, after that was fixed, defaulted to generic office-casual
  humans. Both were bias in a layer the agents don't control. It now
  defaults to a consistent minimal-cyberpunk aesthetic (sleek technical
  gear, subtle bioluminescent/circuit accents, moody high-contrast
  lighting) — a reminder that every generation layer in a system like this
  needs its own explicit style instruction; none of them inherit good taste
  from the layers around them.

None of this was hand-scripted per-scenario; it's what happened running the
actual tick loop and reading the actual output.

## Running it

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL, ANTHROPIC_API_KEY, OPENAI_API_KEY
createdb archetope        # or point DATABASE_URL at an existing db
npm run migrate
npm run seed               # seeds the agents + fires the first tick (console output)
npm start                  # serves the web app at http://localhost:3001
```

`OPENAI_API_KEY` is only needed if you want to use the image-generation
feature (see below) — everything else works without it.

The web app is the primary way to use this now: a live dashboard with a
"Run Next Tick" button.

## What the web app shows

- **Agents** — one card per archetype: current light/shadow state, a
  shadow-lean bar showing what fraction of their last 5 ticks were shadow,
  their latest proposal + reasoning, and a collapsible full history.
  - Click an agent's **MBTI tag** to see what the acronym means and why
    that specific type was assigned to that archetype — a strategic
    pairing, with the reasoning shown.
  - Click any **"💡 Explain"** button on a World State or History entry to
    have a separate analysis call identify which exact phrase reveals that
    agent's archetypal/MBTI signature, and explain why, grounded in the
    actual identity. Cached permanently per entry, same as images (a repeat
    click never re-spends tokens).
  - Click the **⤢ icon** to open a large focus view of any card, with a
    **Conversations tab** showing every direct conversation that specific
    archetype has had with any other, individually.
- **Relationships** — a running sentiment score between every pair of
  agents, shown as a centered bar (right = positive, left = negative). Has
  an (?) info popover explaining the scale.
- **Conversations** — the world-building ticks are pure stigmergy: agents
  react to the aggregated world-state log. Alongside that, each tick also
  runs one direct, turn-taking conversation between two agents who actually
  read and reply to each other's exact words. Click any conversation to read
  the full transcript.
- **World State** — the full, chronological build log, every agent's
  action from every tick, with a small glowing dot per entry that fades
  from full brightness to dim over 24 hours (brightest = most recent).
- **Image generation (opt-in)** — click "🎨 Visualize" on any World State or
  History entry to have Claude craft a visual prompt from that entry and
  OpenAI render it in a consistent minimal-cyberpunk style. Entirely opt-in
  (nothing generates automatically), and permanently cached per entry — a
  second click never re-spends tokens or image credits, it just shows the
  saved image.
- **Gallery** (`gallery.html`) — every image ever generated, in one place,
  with its archetype, timestamp, and original context.

## Architecture

```
db/
  schema.sql        Postgres schema (agents, relationships, world_state,
                     memory, events, conversations, conversation_turns,
                     generated_images, insights)
  migrate.js        applies schema.sql against DATABASE_URL, idempotent

server/
  identities.js     each agent's system prompt: archetype + MBTI + light/
                     shadow + a distinct VOICE and HUMOR branch, plus the
                     shared instructions (modern plain language, 2026
                     tech-awareness, concreteness, earned-not-declared
                     exotic technology — see docs/design-notes/)
  agentClient.js    one Anthropic API call per agent; parses the structured
                     JSON reply, with a resilient fallback if a reply gets
                     truncated
  orchestrator.js   the tick loop — fires an event, collects each agent's
                     stigmergic reaction, writes world_state/relationships/
                     memory, then runs one direct conversation between two
                     agents per tick
  conversation.js   turn-taking dialogue between two agents — each sees the
                     other's actual words directly
  imageClient.js    crafts a visual prompt from a world_state entry (Claude),
                     then generates the image (OpenAI), in a consistent
                     minimal-cyberpunk style
  insightClient.js  a separate, on-demand call that identifies which exact
                     phrase in an agent's own words reveals their
                     archetypal/MBTI signature, and explains why
  api.js            the REST API + static file server for the web app
  db.js             shared Postgres pool
  seed.js           idempotent one-time seed + first tick (console script)

public/
  index.html/app.js             the live dashboard
  gallery.html/gallery.js       the generated-image gallery
  styles/                       10 single-concern CSS files (tokens, layout,
                     agent-card, entry-widgets, relationships, timeline,
                     conversations, modals, toast, gallery), wired through
                     styles/main.css as the single entry point both HTML
                     pages load
  fonts/                        self-hosted display font for the wordmark
```

## The MVP agents

| Archetype      | MBTI | Light                           | Shadow                       |
| -------------- | ---- | ------------------------------- | ---------------------------- |
| The Tower      | ENTJ | necessary revelation            | destruction for its own sake |
| The Hierophant | ISTJ | tradition, wisdom               | dogma, control               |
| The Star       | INFP | hope, healing                   | martyrdom, false hope        |
| The Magician   | ENTP | manifestation, tool-building    | manipulation, deception      |
| The Emperor    | ESTJ | structure, protective authority | tyranny, rigidity            |

Tower vs. Hierophant is built-in conflict (revolutionary vs.
institution-builder). See `archetope-reference.md` for the full 22-arcana
reference and MBTI reasoning — every archetype has light/shadow defined
there already; only the ones instantiated as agents above have an MBTI
assigned. The intent is to eventually grow this roster toward the full 22,
each new archetype getting the same treatment (real MBTI reasoning, a
distinct voice, a distinct branch of humor) — expanding the experiment's
sample size.

## What's next

See `docs/STRETCH_GOALS.md` for the known architectural gaps — most
notably the relationship model, which is currently a single running scalar
and has gone stale (no decay, no texture, and it ignores history data
already being collected in the database).

`docs/design-notes/` records specific design decisions and the reasoning
behind them, for anyone extending this later — starting with why exotic,
physics-defying technology has to be _earned_ through concrete prerequisites
rather than just declared into existence.

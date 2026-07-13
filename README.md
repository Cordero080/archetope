# Archetope

Every culture that's built gods built the same kind of thing: a figure
that's one human trait taken all the way — War, Wisdom, Fertility, Chaos —
not a diluted person carrying a bit of everything, but that single trait in
its pure, undiluted form. Real humans don't work that way; we carry all of
these partially, in tension, mixed together. The gods were what it looks
like when one trait goes all the way through a person instead of staying
mixed in with the rest.

Tarot's 22 Major Arcana are the same catalog in symbolic form — the Self,
the Shadow, the Trickster, the Wise Elder, and so on, each with a
constructive ("light") and a corrupted ("shadow") expression. Myers-Briggs
(MBTI) is the modern, clinical descendant of the same instinct: a system
for cataloging how people fundamentally differ in how they process the
world and make decisions.

Archetope takes that lineage and runs an experiment with it: give each of
the pure archetypal forms — not a diluted human, but the full, undiluted
trait — a Myers-Briggs cognitive style on top, contemporary intelligence
(an LLM), and a modern world, and have them build a civilization together,
one tick at a time, with real memory and evolving relationships between
them. What kind of world do undiluted archetypes build?

## What would count as a result

The underlying question: do small, fixed personality differences —
an archetype's light/shadow poles crossed with an MBTI cognitive style —
produce _distinguishable, consistent_ group dynamics once agents have
persistent memory, a running relationship score with each other, and a
shared world they can see the history of, without ever being told what
conflict to have? A positive result looks like agents pulling toward
different goals for reasons that trace back to their archetype and MBTI
pairing, consistently, across many ticks, rather than random or
interchangeable behavior.

## Findings

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

## The accidental control condition

For a meaningful stretch of this project, a real bug meant each agent's
actual personality description was never being delivered to the model at
all. A naming mismatch (`identityBlock` vs. the database's
`identity_block`) silently sent the literal text `"undefined"` in place of
the identity, for every tick and every conversation — every finding above
happened under this condition.

That's effectively an accidental control group: agents with no identity
block still differentiated from each other, consistently, across ticks.
What the model had to work with instead was indirect — archetype-labeled
entries in the shared world-state log, and each agent's own accumulating
memory of what it had previously said — and that alone was enough for a
capable model to infer and hold a consistent identity.

Once the bug was found and fixed, and each agent was given an explicit,
distinct VOICE (sentence rhythm, directness, hedging) and a specific branch
of HUMOR — a genuinely different comedic register per archetype: deadpan,
dry literalism, bittersweet whimsy, sardonic wit — the differentiation
became sharper and immediate rather than building up over many ticks. Read
together, the two halves say something specific: the system tolerates a
missing identity better than expected, but an explicit identity still
measurably sharpens it.

## Limitations

This is not a controlled experiment in the scientific sense, and it's
worth being upfront about the gaps:

- **N=1.** One continuous world, one set of agents, no repeated trials.
  Nothing here has been replicated across separate runs.
- **No baseline.** There's no comparison group of generic, personality-less
  agents running the same tick loop, so "distinguishable dynamics" is
  judged by reading the output rather than measured against a control.
- **No blinding.** I write the instructions, pick the events, and read the
  transcripts — the read of "this looks like the Tower's personality" is
  my own judgment, not an independent rater's.
- **Small roster.** Five archetypes so far, out of 22. Dynamics could look
  different — or the same conflicts could just repeat — at a larger roster
  size.

These are also the roadmap: repeat runs, a personality-less baseline group,
and growing the roster toward the full 22 are the concrete ways to turn
"anecdotes I find compelling" into something closer to evidence. See
`docs/STRETCH_GOALS.md` for the rest of the architectural gaps.

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

## The agents so far

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
assigned. The plan is to grow this roster toward the full 22, each new
archetype getting the same treatment (real MBTI reasoning, a distinct
voice, a distinct branch of humor), which also expands the experiment's
sample size.

## Architecture

See `docs/ARCHITECTURE.md` for the file-by-file breakdown, and
`docs/design-notes/` for the reasoning behind specific design decisions —
starting with why exotic, physics-defying technology has to be _earned_
through concrete prerequisites rather than just declared into existence.

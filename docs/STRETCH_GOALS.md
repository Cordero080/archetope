# Stretch Goals

Everything built so far has been reactive: watch the agents misbehave, patch
the instruction that caused it. That's fine for an MVP — it's how the modern-
language fix, the tool-awareness fix, and the image-mood fix all happened,
and each one produced a visible, verifiable improvement. This doc is the
list of things that reactive patching *won't* fix, because they're
architectural rather than a bad instruction.

## 1. The relationship model (priority — it's stale)

**Current state:** one scalar per pair, nudged ±1 or ±2 per tick, summed
forever. `relationships.history` already stores every individual shift as
`{event_id, delta, reason, by}` in a JSONB array — but nothing ever reads it
back. The UI only ever shows the running total.

**Why that goes stale:** a shift from tick 2 counts exactly as much as one
from tick 80. Two agents who had one bad tick early and forty good ticks
since look identical to two agents who've been building trust steadily the
whole time, as long as the sum is the same. There's also no way for the
number to mean anything different in kind — "+15" could be "loyal and
proven" or "mutually useful but shallow," and the model can't distinguish
them because the schema doesn't.

**Concrete fixes, roughly in order of effort:**

- **Surface the history that's already stored.** Cheapest possible fix: add
  a `GET /api/relationships/:agentA/:agentB` (or fold into `/api/world`) that
  returns the `history` array, and give each Relationships row the same
  expandable-history treatment the agent cards already have. This alone
  turns "+15" into a readable timeline of *why*, using data already being
  collected.
- **Recency-weighted score instead of a pure running sum.** Decay old
  shifts (e.g. an exponential weighting by tick age) so a relationship
  reflects the recent relationship, not the entire history of it. Keep the
  raw history for the timeline above; change only what the *score* means.
- **Split the single scalar into a couple of axes.** At minimum, trust and
  affection are not the same thing — an agent can respect someone's
  competence while still disliking them personally. Two numbers instead of
  one gets you "wary ally" and "resentful rival" as distinct, representable
  states instead of collapsing them to the same score.
- **Let relationship state actually gate behavior**, not just flavor it.
  Right now sentiment is included as context text and *may* influence a
  reply, softly. A stretch version: below some trust threshold, an agent
  refuses to build on another's unverified claim without independent
  testing; above some threshold, agents start proposing joint work
  unprompted. Makes the number mean something functionally, not just
  narratively.
- **Occasional qualitative summary.** Every N ticks (or on a big enough
  swing), have a small model call turn an agent's relationship history into
  a one-line descriptor ("wary ally," "quiet rivalry," "unspoken respect")
  and store it alongside the score. Cheap, and gives every relationship row
  a human-readable texture beyond a number and a bar.

## 2. Unbounded history → context growth and drift

Every tick currently reads the *entire* `world_state` log as context. Two
problems, same root cause:

- It'll eventually blow past a usable context budget as ticks accumulate.
- It's exactly how the "roots and hearths" language contamination happened
  earlier — the model doesn't just read history, it imitates its style,
  so early bad output keeps reinforcing itself indefinitely unless the
  whole history is wiped.

**Stretch fix:** periodically compact older `world_state` entries into a
short era summary (e.g. after every 20 ticks, collapse ticks 1-20 into a
paragraph) and pass agents the summary + recent raw entries, not the full
raw log forever. Same idea applies to `memory` and conversation history if
they start growing unbounded too.

## 3. No consensus mechanism, despite agents wanting one

The Star independently started demanding the group agree on a goal before
committing to bigger builds — that's an emergent need the system doesn't
actually support yet. There's no way for agents to formally propose,
vote on, or block a decision; "agreement" only exists as agents saying so
in their proposal text, which the next tick's agents may or may not
honor.

**Stretch fix:** a lightweight proposal/response structure for
tick-scale decisions — an agent can flag a proposal as needing group
sign-off, and the tick loop collects explicit yes/no/block from the other
three before it's considered adopted. Doesn't need to be heavyweight; even
a simple majority-of-3 gate would give the Star's objection somewhere real
to land.

## 4. No regression detection for prompt drift

Every fix so far was caught by a human (you) reading the output and
noticing something was off. There's no automated way to catch a regression
— e.g. a future change accidentally reintroducing archaic language, or a
model update changing behavior. A stretch goal: a small eval script that
runs a few ticks against fixed seed data and flags obvious regressions
(banned words reappearing, JSON parse failure rate, proposal length/
concreteness heuristics) so drift gets caught before you spot it manually.

## 5. Build the relationship model overhaul as a teaching session

When we actually build item #1 above (or any future feature), do it as a
guided walkthrough instead of Claude just writing the code: one file at a
time, and for each file — every function explained, the exact line it goes
on, why it's wired to the files/functions around it, and every technical
term defined the moment it's used rather than assumed. The goal is
understanding the codebase well enough to extend it solo, not just having
the feature exist.

## 6. Universal separation of concerns (banner-comment convention)

**Done.** Every JS file in the project is now organized into fixed,
always-in-order sections, each fenced by a `// ---------- NAME ----------`
banner: IMPORTS, CONFIG, HELPERS, MAIN, START (a section with nothing in it
is skipped — most files have three or four). That's all 10 files in
`public/js/`, `public/gallery.js`, all 11 in `server/`, and `db/migrate.js`.

Note the banner style here is the one in `~/.claude/CLAUDE.md`, not the
`// ====...====` / Constants-DOM-Functions-Listeners-Init scheme this item
originally described for the old monolithic `app.js` — that file no longer
exists, having been split into `public/js/*.js`, and the global conventions
file wins over this doc.

Still outstanding: the CSS files in `public/styles/` have no section
banners. Do those file by file as each gets touched, rather than a
big-bang pass.

## 7. Expand beyond the 4 MVP agents into more of the 22 Arcana

`archetope-reference.md` already has light/shadow written for all 22 Major
Arcana — only 4 have MBTI assigned and are wired up as actual agents. Any
newly added archetype must get the same treatment the current 4 just
got: its own specific VOICE (sentence rhythm, directness, hedging) and its
own HUMOR branch (not just "funnier" or "more serious" than the others —
a genuinely different kind of humor, the way Tower's deadpan, Hierophant's
dry literalism, Star's bittersweet whimsy, and Magician's sardonic wit are
each a different branch, not four points on one scale). This is a separate
feature from item #1 (relationship decay) — more agents changes what
they talk about, not how the relationship score is computed; both are
worth doing, but neither substitutes for the other.

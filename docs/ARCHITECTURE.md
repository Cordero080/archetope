# Architecture

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

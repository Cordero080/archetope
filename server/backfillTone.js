// One-off script: classifies tone for every conversation_turns row that
// predates the tone feature (tone IS NULL), so old conversations get tagged
// too, not just ones generated after classifyTone was wired in. Safe to
// re-run — it only ever touches rows still missing a tone.
import { query, pool } from "./db.js";
import { classifyTone } from "./toneClient.js";

async function main() {
  const { rows } = await query(
    `SELECT id, message FROM conversation_turns WHERE tone IS NULL ORDER BY id ASC`,
  );
  console.log(`${rows.length} untagged turn(s) found.`);

  let tagged = 0;
  for (const [i, row] of rows.entries()) {
    const tone = await classifyTone(row.message);
    if (tone) {
      await query(`UPDATE conversation_turns SET tone = $1 WHERE id = $2`, [
        tone,
        row.id,
      ]);
      tagged++;
    }
    console.log(
      `(${i + 1}/${rows.length}) turn ${row.id} -> ${tone ?? "none"}`,
    );
  }

  console.log(
    `\nDone. ${tagged}/${rows.length} turns got a real tone tag (the rest were "none").`,
  );
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

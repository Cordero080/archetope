// Shared Postgres connection pool. Every other module queries through this
// so we don't open a connection per call.

// ---------- IMPORTS ----------
import pg from "pg";
import "dotenv/config";

// ---------- CONFIG ----------
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ---------- MAIN ----------
export function query(text, params) {
  return pool.query(text, params);
}

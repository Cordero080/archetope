// Small, dependency-free utilities shared across every other module.

// ---------- CONFIG ----------
export const ACCENTS = {
  tower: "var(--c-tower)",
  hierophant: "var(--c-hierophant)",
  star: "var(--c-star)",
  magician: "var(--c-magician)",
  emperor: "var(--c-emperor)",
};

// ---------- HELPERS ----------
export function accentFor(key) {
  return ACCENTS[key] || "var(--glass-border)";
}

export function formatRelativeTime(timestamp) {
  const diffSec = Math.max(
    0,
    Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000),
  );
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

// A 0-1 brightness value for the little glowing dot next to each World
// State entry: full brightness for anything under an hour old, fading down
// to a dim floor over 24 hours, so the timeline reads "brightest = newest"
// at a glance.
export function computeGlowIntensity(createdAt) {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  const FLOOR = 0.15;
  return Math.min(1, Math.max(FLOOR, 1 - ageHours / 24));
}

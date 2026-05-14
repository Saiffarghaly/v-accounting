/** Normalize text for case-insensitive substring search (Arabic-friendly). */
export function normalizeListSearch(s: string): string {
  return (s ?? "").toString().toLowerCase().replace(/\s+/g, " ").trim();
}

/** True if query is empty, or if every query token appears in the combined fields. */
export function matchesListSearch(
  query: string,
  ...parts: (string | number | undefined | null)[]
): boolean {
  const raw = normalizeListSearch(query);
  if (!raw) return true;
  const haystack = parts.map((p) => normalizeListSearch(String(p ?? ""))).join(" ");
  const tokens = raw.split(" ").filter(Boolean);
  return tokens.every((t) => haystack.includes(t));
}

export type MatchConfidence =
  | "exact"
  | "code-fuzzy"
  | "name-contains-code"
  | "name-contains-numeric"
  | "none";

export interface MatchCandidate {
  id: string;
  code: string;
  name: string;
}

export interface ItemMatch {
  item: MatchCandidate | null;
  confidence: MatchConfidence;
}

function normalizeAlphanum(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function extractNumericCore(s: string): string {
  const matches = s.match(/\d{3,}/g);
  if (!matches) return "";
  return matches.slice().sort((a, b) => b.length - a.length)[0];
}

/**
 * Estimate which master item a KOP code refers to.
 *
 * Strategy (ordered, first hit wins):
 *   1. Exact case-insensitive match on item.code
 *   2. Alphanumeric-only normalized match on item.code ("9K-86001" ≈ "9K86001")
 *   3. Item.name contains the full normalized KOP code
 *   4. Item.name contains the longest numeric run from the KOP code (e.g. "86001" inside
 *      "YKK API 9k 86001 TK10 6000"). Only when that run is >= 4 digits.
 */
export function estimateItemMatch(
  kopCode: string,
  items: MatchCandidate[]
): ItemMatch {
  const upper = kopCode.toUpperCase();
  const normKop = normalizeAlphanum(kopCode);

  const exact = items.find((i) => i.code.toUpperCase() === upper);
  if (exact) return { item: exact, confidence: "exact" };

  const codeFuzzy = items.find((i) => normalizeAlphanum(i.code) === normKop);
  if (codeFuzzy) return { item: codeFuzzy, confidence: "code-fuzzy" };

  const nameHit = items.find((i) => {
    const normName = normalizeAlphanum(i.name);
    return normKop.length >= 4 && normName.includes(normKop);
  });
  if (nameHit) return { item: nameHit, confidence: "name-contains-code" };

  const numericCore = extractNumericCore(kopCode);
  if (numericCore.length >= 4) {
    const numericHit = items.find((i) => i.name.includes(numericCore));
    if (numericHit) return { item: numericHit, confidence: "name-contains-numeric" };
  }

  return { item: null, confidence: "none" };
}

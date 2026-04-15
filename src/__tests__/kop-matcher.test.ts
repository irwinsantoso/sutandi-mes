import { describe, it, expect } from "vitest";
import { estimateItemMatch, type MatchCandidate } from "@/lib/kop-matcher";

const items: MatchCandidate[] = [
  { id: "1", code: "9K86001", name: "YKK API 9k 86001 TK10 6000" },
  { id: "2", code: "2K-22464", name: "Handle 2K 22464" },
  { id: "3", code: "SEAL-BLACK", name: "Rubber seal black standard" },
  { id: "4", code: "ACP-SILVER", name: "ACP Panel Silver 4mm" },
];

describe("estimateItemMatch", () => {
  it("returns exact match for case-insensitive equal codes", () => {
    const r = estimateItemMatch("2K-22464", items);
    expect(r.confidence).toBe("exact");
    expect(r.item?.id).toBe("2");
  });

  it("returns code-fuzzy for non-alphanumeric differences", () => {
    const r = estimateItemMatch("9K-86001", items);
    expect(r.confidence).toBe("code-fuzzy");
    expect(r.item?.id).toBe("1");
  });

  it("returns name-contains-numeric when only numeric core appears in name", () => {
    const r = estimateItemMatch("PROFIL-86001-XT", items);
    expect(["name-contains-numeric", "name-contains-code"]).toContain(r.confidence);
    expect(r.item?.id).toBe("1");
  });

  it("returns none for a code with no similarity", () => {
    const r = estimateItemMatch("XYZ-ZZZ", items);
    expect(r.confidence).toBe("none");
    expect(r.item).toBeNull();
  });
});

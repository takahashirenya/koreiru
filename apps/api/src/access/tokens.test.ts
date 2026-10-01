import { describe, expect, it } from "vitest";
import { newToken, tokenHash, adminToken } from "./tokens";
describe("限定URLの権限", () => {
  it("256bitのランダムなURLを発行し、ハッシュを保存する", () => {
    const tokens = Array.from({ length: 100 }, newToken);
    expect(new Set(tokens).size).toBe(100);
    expect(tokens.every((t) => /^[A-Za-z0-9_-]{43}$/.test(t))).toBe(true);
    expect(tokenHash(tokens[0])).toHaveLength(64);
    expect(tokenHash(tokens[0])).not.toBe(tokens[0]);
  });
  it("欠落した管理権限と不正なトークンを拒否する", () => {
    expect(() => adminToken()).toThrow();
    expect(() => adminToken("Basic abc")).toThrow();
    expect(() => tokenHash("../abc")).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import {
  boardSchema,
  boardPatchSchema,
  itemSchema,
  requestSchema,
} from "./index";
describe("フォームとAPIの入力検証", () => {
  it("空白の名前と長すぎる入力を拒否する", () => {
    expect(boardSchema.safeParse({ title: "  " }).success).toBe(false);
    expect(itemSchema.safeParse({ name: "a".repeat(101) }).success).toBe(false);
    expect(
      requestSchema.safeParse({ requesterName: "友人", contact: "  " }).success,
    ).toBe(false);
  });
  it("個数は正の整数のみ", () => {
    for (const quantity of [0, -1, 1.5, 1000])
      expect(itemSchema.safeParse({ name: "椅子", quantity }).success).toBe(
        false,
      );
  });
  it("有効期限はタイムゾーン付きの日時", () => {
    expect(
      boardSchema.safeParse({ title: "整理", expiresAt: "明日" }).success,
    ).toBe(false);
    expect(boardSchema.parse({ title: " 整理 ", expiresAt: null }).title).toBe(
      "整理",
    );
  });
});

describe("個人LINEの相談先", () => {
  it("友だち追加リンクを保存し、空欄で解除できる", () => {
    expect(
      boardSchema.parse({
        title: "整理",
        ownerLineUrl: " https://line.me/ti/p/Personal-Test ",
      }).ownerLineUrl,
    ).toBe("https://line.me/ti/p/Personal-Test");
    expect(
      boardSchema.parse({
        title: "整理",
        ownerLineUrl: "https://line.me/R/ti/p/~personal_id",
      }).ownerLineUrl,
    ).toBe("https://line.me/R/ti/p/~personal_id");
    expect(
      boardPatchSchema.parse({ ownerLineUrl: " " }).ownerLineUrl,
    ).toBeNull();
    expect(boardSchema.parse({ title: "整理" }).ownerLineUrl).toBeNull();
  });
  it("ほかの設定だけを変更してもLINEリンクを消さない", () => {
    expect(boardPatchSchema.parse({ isActive: false })).not.toHaveProperty(
      "ownerLineUrl",
    );
  });
  it.each([
    "javascript:alert(1)",
    "http://line.me/ti/p/Personal-Test",
    "https://line.me.evil.example/ti/p/Personal-Test",
    "https://evil.example/ti/p/Personal-Test",
    "https://line.me@evil.example/ti/p/Personal-Test",
    "https://user:pass@line.me/ti/p/Personal-Test",
    "https://line.me/R/share?text=test",
    "https://line.me/ti/p/Personal-Test?redirect=evil",
    "https://line.me/ti/p/Personal-Test#fragment",
    "https://line.me/ti/p/%40official",
    "https://line.me/ti/p/@official",
    "https://lin.ee/test",
  ])("個人の友だち追加リンク以外を拒否する: %s", (ownerLineUrl) => {
    expect(boardPatchSchema.safeParse({ ownerLineUrl }).success).toBe(false);
  });
});

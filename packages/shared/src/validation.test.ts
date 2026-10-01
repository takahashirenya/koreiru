import { describe, expect, it } from "vitest";
import { boardSchema, itemSchema, requestSchema } from "./index";
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

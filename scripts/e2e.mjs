import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { unlink } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import assert from "node:assert/strict";
config({ path: ".env", quiet: true });
const dbUrl = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1"].includes(dbUrl.hostname))
  throw new Error("画面テストはローカルDB専用です");
const browser = await chromium.launch();
const db = new PrismaClient();
let boardId;
try {
  const ownerContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const owner = await ownerContext.newPage();
  const errors = [];
  owner.on("pageerror", (e) => errors.push(e.message));
  owner.on("dialog", (dialog) => dialog.accept());
  await owner.goto("http://localhost:5173");
  await owner.getByRole("button", { name: "譲渡ボードを作る" }).click();
  await owner.getByLabel("ボード名").fill("画面テストの譲渡ボード");
  await owner.getByLabel("ひとこと").fill("テスト終了時に削除されます");
  await owner.getByRole("button", { name: "ボードを作成する" }).click();
  await owner.waitForURL("**/manage/**");
  await owner
    .getByRole("button", { name: "品物を追加", exact: true })
    .first()
    .click();
  await owner.getByLabel("品物の名前").fill("テスト用の椅子");
  await owner.getByLabel("説明・状態").fill("幅45cm。自宅で受け渡しできます。");
  const png = await sharp({
    create: { width: 240, height: 180, channels: 3, background: "#356859" },
  })
    .png()
    .toBuffer();
  await owner
    .locator("input[type=file]")
    .setInputFiles([{ name: "chair.png", mimeType: "image/png", buffer: png }]);
  await owner.getByRole("button", { name: "品物を保存" }).click();
  await owner.getByRole("heading", { name: "テスト用の椅子" }).waitFor();
  const saved = await owner.evaluate(
    () => JSON.parse(localStorage.getItem("koreiru.boards"))[0],
  );
  const record = await db.board.findUniqueOrThrow({
    where: {
      adminTokenHash: (await import("node:crypto"))
        .createHash("sha256")
        .update(saved.adminToken)
        .digest("hex"),
    },
  });
  boardId = record.id;
  await owner.getByRole("button", { name: "設定・共有" }).click();
  await owner
    .getByRole("button", { name: "共有URLをコピー", exact: true })
    .waitFor();
  assert.equal(
    await owner
      .getByRole("textbox", { name: "共有URLをコピー", exact: true })
      .inputValue(),
    `http://localhost:5173/share/${saved.shareToken}`,
  );
  await owner.keyboard.press("Escape");
  const guestContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const guest = await guestContext.newPage();
  guest.on("pageerror", (e) => errors.push(e.message));
  guest.on("dialog", (dialog) => dialog.accept());
  await guest.goto(`http://localhost:5173/share/${saved.shareToken}`);
  await guest.getByRole("button", { name: "詳細を見る・手を挙げる" }).click();
  await guest.getByLabel("お名前").fill("テストの友人");
  await guest
    .getByLabel("連絡先（メール・電話番号など）")
    .fill("friend@example.test");
  await guest.getByLabel("持ち主へのメッセージ").fill("大切に使います");
  await guest.getByRole("button", { name: "欲しいです、と伝える" }).click();
  await guest.waitForURL("**/request/**");
  await guest.getByRole("heading", { name: "応募中", exact: true }).waitFor();
  const receiptUrl = guest.url();
  assert.equal(
    await guest.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "モバイルに横スクロールがない",
  );
  await guest.getByRole("button", { name: "応募を取り消す" }).click();
  await guest.getByRole("heading", { name: "取り消し済み" }).waitFor();
  await guest.goto(`http://localhost:5173/share/${saved.shareToken}`);
  await guest.getByRole("button", { name: "詳細を見る・手を挙げる" }).click();
  await guest.getByLabel("お名前").fill("テストの友人");
  await guest
    .getByLabel("連絡先（メール・電話番号など）")
    .fill("friend@example.test");
  await guest.getByRole("button", { name: "欲しいです、と伝える" }).click();
  await guest.waitForURL("**/request/**");
  assert.notEqual(guest.url(), receiptUrl);
  await owner.reload();
  await owner.getByRole("button", { name: /詳細・希望者/ }).click();
  await owner.getByRole("button", { name: "この人に譲る" }).click();
  await owner.getByRole("button", { name: "受け渡し完了" }).waitFor();
  await guest.reload();
  await guest.getByRole("heading", { name: "あなたに決定" }).waitFor();
  await owner.getByRole("button", { name: "受け渡し完了" }).click();
  await owner.getByText("譲渡済み", { exact: true }).last().waitFor();
  await guest.reload();
  await guest.getByText("受け渡しが完了しました。", { exact: true }).waitFor();
  await owner.getByRole("button", { name: "閉じる", exact: true }).click();
  await owner.getByRole("button", { name: "設定・共有" }).click();
  await owner.getByRole("button", { name: "共有を停止する" }).click();
  await owner.getByRole("button", { name: "共有を再開する" }).waitFor();
  await guest.goto(`http://localhost:5173/share/${saved.shareToken}`);
  await guest
    .getByText("共有が停止されているか、URLの有効期限が切れています")
    .waitFor();
  assert.deepEqual(errors, []);
  await guest.goto("http://localhost:5173");
  await guest.getByRole("button", { name: "譲渡ボードを作る" }).waitFor();
  await guest.screenshot({ path: "/tmp/koreiru-mobile.png", fullPage: true });
  await owner.goto("http://localhost:5173");
  await owner.screenshot({ path: "/tmp/koreiru-desktop.png", fullPage: true });
  console.log(
    "画面テスト成功: 作成・写真追加・共有・応募・取消・相手決定・受渡完了・共有停止・モバイル幅",
  );
} finally {
  if (boardId) {
    const images = await db.itemImage.findMany({
      where: { item: { boardId } },
    });
    await db.board.delete({ where: { id: boardId } });
    await Promise.all(
      images.map((image) =>
        unlink(
          resolve(process.env.STORAGE_PATH || "storage", image.storageKey),
        ).catch(() => {}),
      ),
    );
  }
  await db.$disconnect();
  await browser.close();
}

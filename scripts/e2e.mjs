import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { unlink } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import assert from "node:assert/strict";
config({ path: ".env", quiet: true });
const dbUrl = new URL(process.env.DATABASE_URL);
if (!["localhost", "0.0.0.0"].includes(dbUrl.hostname))
  throw new Error("画面テストはローカルDB専用です");
const browser = await chromium.launch();
const db = new PrismaClient();
let boardId;
try {
  const ownerContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const owner = await ownerContext.newPage();
  await ownerContext.grantPermissions(["clipboard-read", "clipboard-write"]);
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
  const lineUrl = "https://line.me/ti/p/Personal-Test";
  await owner.getByLabel("持ち主のLINE友だち追加リンク（任意）").fill(lineUrl);
  await Promise.all([
    owner.waitForResponse(
      (response) =>
        response.url().includes("/api/manage/boards/") &&
        response.request().method() === "PATCH" &&
        response.status() === 200,
    ),
    owner.getByRole("button", { name: "変更を保存", exact: true }).click(),
  ]);
  assert.equal(
    await owner
      .getByRole("textbox", { name: "共有URLをコピー", exact: true })
      .inputValue(),
    `http://localhost:5173/share/${saved.shareToken}`,
  );
  await owner
    .getByRole("button", { name: "共有URLをコピー", exact: true })
    .click();
  await owner.getByRole("button", { name: "コピーしました" }).waitFor();
  const sharedUrl = await owner.evaluate(() => navigator.clipboard.readText());
  assert.equal(sharedUrl, `http://localhost:5173/share/${saved.shareToken}`);
  // スマホのHTTP接続と権限拒否で、以前のLINE URLが残らないことを確認する。
  for (const unavailable of [true, false]) {
    await owner.evaluate(
      async ({ lineUrl, unavailable }) => {
        await navigator.clipboard.writeText(lineUrl);
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: unavailable
            ? undefined
            : {
                writeText: async () => {
                  throw new Error("clipboard denied");
                },
              },
        });
      },
      { lineUrl, unavailable },
    );
    await owner.getByRole("button", { name: "コピーしました" }).click();
    await owner.getByRole("button", { name: "コピーしました" }).waitFor();
    await owner.evaluate(() => delete navigator.clipboard);
    assert.equal(
      await owner.evaluate(() => navigator.clipboard.readText()),
      sharedUrl,
      "代替コピーで以前のLINE URLを共有URLに置き換える",
    );
  }
  await owner.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: () => false,
    });
  });
  await owner.getByRole("button", { name: "コピーしました" }).click();
  await owner.getByText(/以下のURLを長押ししてコピーしてください/).waitFor();
  assert.equal(
    await owner.getByRole("button", { name: "コピーしました" }).count(),
    0,
  );
  await owner.evaluate(() => {
    delete navigator.clipboard;
    delete document.execCommand;
  });
  await owner.keyboard.press("Escape");
  const guestContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await guestContext.grantPermissions(["clipboard-read", "clipboard-write"]);
  const guest = await guestContext.newPage();
  // 実際のLINEへアクセスせず、プロフィールへの遷移だけ検証する。
  await guest.route(lineUrl, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>LINEプロフィールのテスト画面</h1>",
    }),
  );
  guest.on("pageerror", (e) => errors.push(e.message));
  guest.on("dialog", (dialog) => dialog.accept());
  const lineRequests = [];
  guest.on("request", (request) => {
    if (new URL(request.url()).hostname === "line.me")
      lineRequests.push(request.url());
  });
  await guest.goto(sharedUrl);
  await guest
    .getByRole("heading", { name: "画面テストの譲渡ボード", exact: true })
    .waitFor();
  await guest.reload();
  await guest.getByRole("heading", { name: "テスト用の椅子" }).waitFor();
  assert.equal(guest.url(), sharedUrl, "共有URLは共有画面に留まる");
  assert.deepEqual(lineRequests, [], "共有URLを開いてもLINEに接続しない");
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
  const lineButton = "メッセージをコピーして、持ち主のLINEを開く";
  await guest.getByRole("button", { name: lineButton }).click();
  await guest.waitForURL(lineUrl);
  const copiedMessage = await guest.evaluate(() =>
    navigator.clipboard.readText(),
  );
  assert.ok(copiedMessage.includes("テスト用の椅子"));
  assert.ok(copiedMessage.includes("テストの友人"));
  assert.ok(copiedMessage.includes("大切に使います"));
  assert.ok(!copiedMessage.includes(receiptUrl.split("/").pop()));
  for (const unavailable of [true, false]) {
    await guest.goto(receiptUrl);
    await guest.getByRole("button", { name: lineButton }).waitFor();
    await guest.evaluate(async (unavailable) => {
      await navigator.clipboard.writeText("コピー前の文面");
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: unavailable
          ? undefined
          : {
              writeText: async () => {
                throw new Error("clipboard denied");
              },
            },
      });
    }, unavailable);
    await guest.getByRole("button", { name: lineButton }).click();
    await guest.waitForURL(lineUrl);
    assert.equal(
      await guest.evaluate(() => navigator.clipboard.readText()),
      copiedMessage,
      "メッセージも代替コピーしてからLINEを開く",
    );
  }
  await guest.goto(receiptUrl);
  await guest.getByRole("heading", { name: "応募中", exact: true }).waitFor();
  assert.equal(
    await guest.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "モバイルに横スクロールがない",
  );
  await guest.getByRole("button", { name: "応募を取り消す" }).click();
  await guest.getByRole("heading", { name: "取り消し済み" }).waitFor();
  assert.equal(
    await guest.getByRole("button", { name: lineButton }).count(),
    0,
  );
  await guest.goto(`http://localhost:5173/share/${saved.shareToken}`);
  await guest.getByRole("button", { name: "詳細を見る・手を挙げる" }).click();
  await guest.getByLabel("お名前").fill("テストの友人");
  await guest
    .getByLabel("連絡先（メール・電話番号など）")
    .fill("friend@example.test");
  await guest.getByRole("button", { name: "欲しいです、と伝える" }).click();
  await guest.waitForURL("**/request/**");
  assert.notEqual(guest.url(), receiptUrl);
  await guest.getByRole("button", { name: lineButton }).waitFor();
  await guest.evaluate(() => {
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: () => false,
    });
    Object.defineProperty(navigator.clipboard, "writeText", {
      configurable: true,
      value: async () => {
        throw new Error("clipboard denied");
      },
    });
  });
  const secondReceiptUrl = guest.url();
  await guest.getByRole("button", { name: lineButton }).click();
  await guest.getByText(/コピーできませんでした/).waitFor();
  assert.equal(guest.url(), secondReceiptUrl);
  assert.equal(
    await guest
      .getByRole("link", { name: "持ち主のLINEを開く", exact: true })
      .getAttribute("href"),
    lineUrl,
  );
  assert.ok(
    (await guest.getByLabel("LINEで送る文面").inputValue()).includes(
      "テスト用の椅子",
    ),
  );
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
  assert.equal(
    await guest.getByRole("button", { name: lineButton }).count(),
    0,
  );
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
    "画面テスト成功: 作成・写真追加・共有・応募・LINE設定・文面コピー・プロフィール遷移・コピー失敗時の代替操作・取消・相手決定・受渡完了・共有停止・モバイル幅",
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

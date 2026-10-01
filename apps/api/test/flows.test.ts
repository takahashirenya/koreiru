import "reflect-metadata";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { NestFactory } from "@nestjs/core";
import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import sharp from "sharp";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppModule } from "../src/app.module";
import { configure } from "../src/common/configure";
let app: INestApplication, db: PrismaClient, storage: string;
const created: string[] = [];
let admin: string,
  share: string,
  item: string,
  wishA: string,
  wishB: string,
  image: string;
const auth = () => `Bearer ${admin}`;
const server = () => app.getHttpServer();
beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.includes("test"))
    throw new Error(
      "専用テストDBをTEST_DATABASE_URLに指定してください（DB名にtestを含める）",
    );
  process.env.DATABASE_URL = url;
  storage = await mkdtemp(join(tmpdir(), "koreiru-images-"));
  process.env.STORAGE_PATH = storage;
  db = new PrismaClient();
  app = await NestFactory.create(AppModule, { logger: false });
  configure(app);
  await app.init();
});
afterAll(async () => {
  if (db) {
    await db.board.deleteMany({ where: { id: { in: created } } });
    await db.$disconnect();
  }
  if (app) await app.close();
  if (storage) await rm(storage, { recursive: true, force: true });
});
describe.sequential("ボードから直接受け渡しまで", () => {
  it("ボードを作成し、生のトークンをDBと共有レスポンスに残さない", async () => {
    const result = await request(server())
      .post("/api/boards")
      .send({ title: "引っ越し", description: "身内向け" })
      .expect(201);
    admin = result.body.adminToken;
    share = result.body.shareToken;
    created.push(result.body.id);
    const stored = await db.board.findUniqueOrThrow({
      where: { id: result.body.id },
    });
    expect(stored.adminTokenHash).not.toBe(admin);
    expect(stored.shareTokenHash).not.toBe(share);
    const shared = await request(server())
      .get(`/api/share/${share}`)
      .expect(200);
    expect(shared.body.adminTokenHash).toBeUndefined();
    expect(shared.body.shareTokenHash).toBeUndefined();
    expect(shared.headers["x-robots-tag"]).toContain("noindex");
    expect(shared.headers["cache-control"]).toBe("no-store");
  });
  it("品物を作り、管理権限なしの編集を拒否する", async () => {
    const result = await request(server())
      .post(`/api/manage/boards/${admin}/items`)
      .send({ name: "椅子", quantity: 2 })
      .expect(201);
    item = result.body.id;
    await request(server())
      .patch(`/api/manage/items/${item}`)
      .send({ name: "不正変更" })
      .expect(401);
    await request(server())
      .patch(`/api/manage/items/${item}`)
      .set("Authorization", `Bearer ${share}`)
      .send({ name: "不正変更" })
      .expect(404);
    const other = await request(server())
      .post("/api/boards")
      .send({ title: "別のボード" })
      .expect(201);
    created.push(other.body.id);
    await request(server())
      .delete(`/api/manage/items/${item}`)
      .set("Authorization", `Bearer ${other.body.adminToken}`)
      .expect(404);
    await request(server())
      .patch(`/api/manage/items/${item}`)
      .set("Authorization", auth())
      .send({ status: "given" })
      .expect(409);
  });
  it("複数画像を変換して保存し、偽装画像を拒否する", async () => {
    const png = await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#356859" },
    })
      .png()
      .toBuffer();
    await request(server())
      .post(`/api/manage/items/${item}/images`)
      .set("Authorization", auth())
      .attach("images", png, "first.png")
      .attach("images", png, "second.png")
      .expect(201);
    const board = await request(server())
      .get(`/api/share/${share}`)
      .expect(200);
    image = board.body.items[0].images[0].id;
    expect(board.body.items[0].images).toHaveLength(2);
    const response = await request(server())
      .get(`/api/share/${share}/items/${item}/images/${image}`)
      .expect(200);
    expect(response.headers["content-type"]).toContain("image/webp");
    await request(server())
      .post(`/api/manage/items/${item}/images`)
      .set("Authorization", auth())
      .attach("images", Buffer.from("<script>bad</script>"), "fake.png")
      .expect(400);
    await request(server())
      .get(`/api/share/invalid/items/${item}/images/${image}`)
      .expect(404);
  });
  it("複数人の応募を受け付け、連絡先とメッセージは公開しない", async () => {
    const a = await request(server())
      .post(`/api/share/${share}/items/${item}/requests`)
      .send({
        requesterName: "家族",
        contact: "private@example.test",
        message: "秘密のメッセージ",
      })
      .expect(201);
    wishA = a.body.requestToken;
    const b = await request(server())
      .post(`/api/share/${share}/items/${item}/requests`)
      .send({ requesterName: "友人", contact: "friend@example.test" })
      .expect(201);
    wishB = b.body.requestToken;
    const response = await request(server())
      .get(`/api/share/${share}`)
      .expect(200);
    expect(JSON.stringify(response.body)).not.toContain("private@example.test");
    expect(JSON.stringify(response.body)).not.toContain("秘密のメッセージ");
    expect(response.body.items[0].requestCount).toBe(2);
    const owner = await request(server())
      .get(`/api/manage/boards/${admin}`)
      .expect(200);
    expect(owner.body.items[0].requests[0].manageTokenHash).toBeUndefined();
  });
  it("同時に2人を選んでも決定は1人のみ", async () => {
    const board = await request(server())
      .get(`/api/manage/boards/${admin}`)
      .expect(200);
    const wishes = board.body.items[0].requests;
    const results = await Promise.all(
      wishes.map((w: { id: string }) =>
        request(server())
          .patch(`/api/manage/requests/${w.id}`)
          .set("Authorization", auth())
          .send({ status: "selected" }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const stored = await db.request.findMany({ where: { itemId: item } });
    expect(stored.filter((w) => w.status === "selected")).toHaveLength(1);
    expect(stored.filter((w) => w.status === "declined")).toHaveLength(1);
    await request(server())
      .post(`/api/share/${share}/items/${item}/requests`)
      .send({ requesterName: "第三者", contact: "x" })
      .expect(409);
  });
  it("選ばれた人が応募を取り消すと受付が再開する", async () => {
    const a = await request(server()).get(`/api/requests/${wishA}`).expect(200);
    const selected = a.body.status === "selected" ? wishA : wishB;
    await request(server()).delete(`/api/requests/${selected}`).expect(200);
    const response = await request(server())
      .get(`/api/share/${share}`)
      .expect(200);
    expect(response.body.items[0].status).toBe("available");
    await request(server()).delete(`/api/requests/${selected}`).expect(200);
  });
  it("共有停止で一覧・画像・応募を拒否し、応募確認は維持する", async () => {
    await request(server())
      .patch(`/api/manage/boards/${admin}`)
      .send({ isActive: false })
      .expect(200);
    await request(server()).get(`/api/share/${share}`).expect(404);
    await request(server())
      .get(`/api/share/${share}/items/${item}/images/${image}`)
      .expect(404);
    await request(server())
      .post(`/api/share/${share}/items/${item}/requests`)
      .send({ requesterName: "第三者", contact: "x" })
      .expect(404);
    await request(server()).get(`/api/requests/${wishA}`).expect(200);
    await request(server())
      .get(`/api/manage/boards/${admin}/items/${item}/images/${image}`)
      .expect(200);
  });
  it("共有URLの再発行で古いURLを無効化する", async () => {
    const next = await request(server())
      .post(`/api/manage/boards/${admin}/share-token`)
      .expect(201);
    await request(server())
      .patch(`/api/manage/boards/${admin}`)
      .send({ isActive: true })
      .expect(200);
    await request(server()).get(`/api/share/${share}`).expect(404);
    share = next.body.shareToken;
    await request(server()).get(`/api/share/${share}`).expect(200);
  });
  it("有効期限経過で閲覧を停止する", async () => {
    await db.board.update({
      where: { id: created[0] },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await request(server()).get(`/api/share/${share}`).expect(404);
    await request(server())
      .patch(`/api/manage/boards/${admin}`)
      .send({ expiresAt: null })
      .expect(200);
  });
  it("相手を決めて受け渡し済みにし、取消を拒否する", async () => {
    const result = await request(server())
      .post(`/api/share/${share}/items/${item}/requests`)
      .send({ requesterName: "同僚", contact: "colleague@example.test" })
      .expect(201);
    const receipt = await request(server())
      .get(`/api/requests/${result.body.requestToken}`)
      .expect(200);
    await request(server())
      .patch(`/api/manage/requests/${receipt.body.id}`)
      .set("Authorization", auth())
      .send({ status: "selected" })
      .expect(200);
    await request(server())
      .patch(`/api/manage/items/${item}`)
      .set("Authorization", auth())
      .send({ status: "given" })
      .expect(200);
    await request(server())
      .delete(`/api/requests/${result.body.requestToken}`)
      .expect(409);
    const board = await request(server())
      .get(`/api/share/${share}`)
      .expect(200);
    expect(board.body.items[0].status).toBe("given");
  });
  it("写真と品物を削除する", async () => {
    await request(server())
      .delete(`/api/manage/items/${item}/images/${image}`)
      .set("Authorization", auth())
      .expect(200);
    await request(server())
      .get(`/api/share/${share}/items/${item}/images/${image}`)
      .expect(404);
    await request(server())
      .delete(`/api/manage/items/${item}`)
      .set("Authorization", auth())
      .expect(200);
    expect(await db.request.count({ where: { itemId: item } })).toBe(0);
  });
  it("入力チェックと応募回数制限を適用する", async () => {
    await request(server())
      .post("/api/boards")
      .send({ title: " " })
      .expect(400);
    let throttled = false;
    for (let i = 0; i < 12; i++) {
      const result = await request(server())
        .post(`/api/share/${share}/items/${item}/requests`)
        .send({ requesterName: "x", contact: "" });
      if (result.status === 429) throttled = true;
    }
    expect(throttled).toBe(true);
  });
});

import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { itemSchema, itemPatchSchema } from "@koreiru/shared";
import { DatabaseService } from "../database/database.service";
import { AccessService } from "../access/access.service";
import { ImageStorage } from "../uploads/storage.service";
import { parse, uuid } from "../common/validation";
@Injectable()
export class ItemsService {
  constructor(
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(AccessService) private access: AccessService,
    @Inject(ImageStorage) private storage: ImageStorage,
  ) {}
  async item(
    token: string,
    id: string,
    db: Prisma.TransactionClient = this.db,
  ) {
    const board = await this.access.owner(token, db);
    const item = await db.item.findFirst({
      where: { id: uuid(id), boardId: board.id },
    });
    if (!item) throw new NotFoundException("品物が見つかりません");
    return item;
  }
  async createItem(token: string, body: unknown) {
    const board = await this.access.owner(token);
    return this.db.item.create({
      data: { ...parse(itemSchema, body), boardId: board.id },
      select: { id: true },
    });
  }
  async patchItem(token: string, id: string, body: unknown) {
    const data = parse(itemPatchSchema, body);
    return this.db.atomic(async (tx) => {
      const item = await this.item(token, id, tx);
      if (data.status === "reserved" && item.status !== "reserved")
        throw new ConflictException("希望者を選ぶと相談中になります");
      if (data.status === "given" && item.status === "available")
        throw new ConflictException("先に譲る相手を決めてください");
      if (data.status === "available" && item.status !== "available") {
        await tx.request.updateMany({
          where: { itemId: id, status: "selected" },
          data: { status: "pending" },
        });
      }
      if (data.status === "given")
        await tx.request.updateMany({
          where: { itemId: id, status: "pending" },
          data: { status: "declined" },
        });
      return tx.item.update({ where: { id }, data, select: { id: true } });
    });
  }
  async deleteItem(token: string, id: string) {
    const keys = await this.db.atomic(async (tx) => {
      await this.item(token, id, tx);
      const files = await tx.itemImage.findMany({ where: { itemId: id } });
      await tx.item.delete({ where: { id } });
      return files.map((i) => i.storageKey);
    });
    await Promise.all(keys.map((key) => this.storage.remove(key)));
    return { ok: true };
  }
  async upload(token: string, id: string, files: Express.Multer.File[]) {
    await this.item(token, id);
    if (!files?.length) throw new BadRequestException("画像を選んでください");
    const keys: string[] = [];
    try {
      for (const file of files) keys.push(await this.storage.save(file.buffer));
      await this.db.atomic(async (tx) => {
        await this.item(token, id, tx);
        const current = await tx.itemImage.findMany({ where: { itemId: id } });
        if (current.length + keys.length > 8)
          throw new BadRequestException("写真は1品につき8枚までです");
        const next = Math.max(-1, ...current.map((i) => i.displayOrder)) + 1;
        await tx.itemImage.createMany({
          data: keys.map((storageKey, i) => ({
            itemId: id,
            storageKey,
            displayOrder: next + i,
          })),
        });
      });
    } catch (error) {
      await Promise.all(keys.map((k) => this.storage.remove(k)));
      throw error;
    }
    return { ok: true };
  }
  async deleteImage(token: string, itemId: string, imageId: string) {
    const key = await this.db.atomic(async (tx) => {
      await this.item(token, itemId, tx);
      const image = await tx.itemImage.findFirst({
        where: { id: uuid(imageId), itemId },
      });
      if (!image) throw new NotFoundException("画像が見つかりません");
      await tx.itemImage.delete({ where: { id: image.id } });
      return image.storageKey;
    });
    await this.storage.remove(key);
    return { ok: true };
  }
  async image(token: string, itemId: string, imageId: string, owner: boolean) {
    const board = owner
      ? await this.access.owner(token)
      : await this.access.shared(token);
    const image = await this.db.itemImage.findFirst({
      where: {
        id: uuid(imageId),
        itemId: uuid(itemId),
        item: { boardId: board.id },
      },
    });
    if (!image) throw new NotFoundException("画像が見つかりません");
    try {
      return await this.storage.read(image.storageKey);
    } catch {
      throw new NotFoundException("画像が見つかりません");
    }
  }
}

import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { requestSchema } from "@koreiru/shared";
import { z } from "zod";
import { DatabaseService } from "../database/database.service";
import { AccessService } from "../access/access.service";
import { newToken, tokenHash } from "../access/tokens";
import { parse, uuid } from "../common/validation";
import { wishes } from "../common/selectors";
const PrismaSelectionSchema = z.object({
  status: z.enum(["selected", "declined"]),
});
@Injectable()
export class RequestsService {
  constructor(
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(AccessService) private access: AccessService,
  ) {}
  async apply(token: string, id: string, body: unknown) {
    const data = parse(requestSchema, body),
      requestToken = newToken();
    await this.db.atomic(async (tx) => {
      const board = await this.access.shared(token, tx);
      const item = await tx.item.findFirst({
        where: { id: uuid(id), boardId: board.id },
      });
      if (!item) throw new NotFoundException("品物が見つかりません");
      if (item.status !== "available")
        throw new ConflictException("この品物の受付は終了しました");
      await tx.request.create({
        data: { ...data, itemId: id, manageTokenHash: tokenHash(requestToken) },
      });
    });
    return { requestToken };
  }
  async application(token: string) {
    const wish = await this.db.request.findUnique({
      where: { manageTokenHash: tokenHash(token) },
      select: {
        ...wishes.select,
        item: {
          select: {
            id: true,
            name: true,
            status: true,
            pickupNote: true,
            board: { select: { title: true, isActive: true, expiresAt: true } },
          },
        },
      },
    });
    if (!wish) throw new NotFoundException("応募確認URLが無効です");
    const { board, ...item } = wish.item;
    return {
      ...wish,
      item,
      boardTitle: board.title,
      sharingAvailable:
        board.isActive && (!board.expiresAt || board.expiresAt > new Date()),
    };
  }
  async cancel(token: string) {
    return this.db.atomic(async (tx) => {
      const wish = await tx.request.findUnique({
        where: { manageTokenHash: tokenHash(token) },
        include: { item: true },
      });
      if (!wish) throw new NotFoundException("応募確認URLが無効です");
      if (wish.status === "cancelled") return { ok: true };
      if (wish.item.status === "given")
        throw new ConflictException("受け渡し済みの応募は取り消せません");
      if (wish.status === "selected")
        await tx.item.update({
          where: { id: wish.itemId },
          data: { status: "available" },
        });
      await tx.request.update({
        where: { id: wish.id },
        data: { status: "cancelled" },
      });
      return { ok: true };
    });
  }
  async select(token: string, id: string, body: unknown) {
    const { status } = parse(PrismaSelectionSchema, body);
    return this.db.atomic(async (tx) => {
      const board = await this.access.owner(token, tx);
      const wish = await tx.request.findFirst({
        where: { id: uuid(id), item: { boardId: board.id } },
        include: { item: true },
      });
      if (!wish) throw new NotFoundException("応募が見つかりません");
      if (wish.item.status !== "available" || wish.status !== "pending")
        throw new ConflictException("受付中の品物の応募者から選んでください");
      if (status === "selected") {
        await tx.request.updateMany({
          where: { itemId: wish.itemId, status: "pending", id: { not: id } },
          data: { status: "declined" },
        });
        await tx.item.update({
          where: { id: wish.itemId },
          data: { status: "reserved" },
        });
      }
      await tx.request.update({ where: { id }, data: { status } });
      return { ok: true };
    });
  }
}

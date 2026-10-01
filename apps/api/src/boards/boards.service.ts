import { Inject, Injectable, BadRequestException } from "@nestjs/common";
import { boardSchema, boardPatchSchema } from "@koreiru/shared";
import { DatabaseService } from "../database/database.service";
import { AccessService } from "../access/access.service";
import { newToken, tokenHash } from "../access/tokens";
import { parse } from "../common/validation";
import { publicBoard, publicItem, wishes } from "../common/selectors";
@Injectable()
export class BoardsService {
  constructor(
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(AccessService) private access: AccessService,
  ) {}
  async create(body: unknown) {
    const data = parse(boardSchema, body);
    this.checkExpiry(data.expiresAt);
    const shareToken = newToken(),
      adminToken = newToken();
    const board = await this.db.board.create({
      data: {
        ...data,
        shareTokenHash: tokenHash(shareToken),
        adminTokenHash: tokenHash(adminToken),
      },
      select: { id: true, title: true },
    });
    return { ...board, shareToken, adminToken };
  }
  checkExpiry(value?: string | null) {
    if (value && new Date(value) <= new Date())
      throw new BadRequestException("有効期限は未来の日時を選んでください");
  }
  async manage(token: string) {
    const board = await this.access.owner(token);
    const result = await this.db.board.findUniqueOrThrow({
      where: { id: board.id },
      select: {
        ...publicBoard,
        ownerLineUrl: true,
        items: {
          select: { ...publicItem, requests: wishes },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return { ...result, hasLineContact: !!board.ownerLineUrl };
  }
  async patchBoard(token: string, body: unknown) {
    const data = parse(boardPatchSchema, body);
    this.checkExpiry(data.expiresAt);
    const board = await this.access.owner(token);
    return this.db.board.update({
      where: { id: board.id },
      data,
      select: { id: true },
    });
  }
  async rotate(token: string) {
    const shareToken = newToken();
    const board = await this.access.owner(token);
    await this.db.board.update({
      where: { id: board.id },
      data: { shareTokenHash: tokenHash(shareToken) },
    });
    return { shareToken };
  }
  async share(token: string) {
    const board = await this.access.shared(token);
    const result = await this.db.board.findUniqueOrThrow({
      where: { id: board.id },
      select: publicBoard,
    });
    return {
      ...result,
      hasLineContact: !!board.ownerLineUrl,
      items: result.items.map(({ _count, ...item }) => ({
        ...item,
        requestCount: _count.requests,
      })),
    };
  }
}

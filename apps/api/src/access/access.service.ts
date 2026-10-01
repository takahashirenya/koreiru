import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Board } from "@prisma/client";
import { DatabaseService } from "../database/database.service";
import { tokenHash } from "./tokens";
@Injectable()
export class AccessService {
  constructor(@Inject(DatabaseService) private db: DatabaseService) {}
  async owner(token: string, db: Prisma.TransactionClient = this.db) {
    const board = await db.board.findUnique({
      where: { adminTokenHash: tokenHash(token) },
    });
    if (!board) throw new NotFoundException("管理URLが無効です");
    return board;
  }
  async shared(token: string, db: Prisma.TransactionClient = this.db) {
    const board = await db.board.findUnique({
      where: { shareTokenHash: tokenHash(token) },
    });
    if (!board || !this.isShared(board))
      throw new NotFoundException(
        "共有が停止されているか、URLの有効期限が切れています",
      );
    return board;
  }
  isShared(board: Board) {
    return board.isActive && (!board.expiresAt || board.expiresAt > new Date());
  }
}

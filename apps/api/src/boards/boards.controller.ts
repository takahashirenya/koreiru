import {
  Controller,
  Inject,
  Get,
  Post,
  Patch,
  Body,
  Param,
  NotFoundException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { BoardsService } from "./boards.service";
@Controller()
export class BoardsController {
  constructor(@Inject(BoardsService) private boards: BoardsService) {}
  @Get("health") health() {
    return { ok: true };
  }
  @Post("boards") @Throttle({ default: { limit: 10, ttl: 60000 } }) create(
    @Body() body: unknown,
  ) {
    return this.boards.create(body);
  }
  @Get("manage/boards/:token") manage(@Param("token") token: string) {
    return this.boards.manage(token);
  }
  @Patch("manage/boards/:token") patchBoard(
    @Param("token") token: string,
    @Body() body: unknown,
  ) {
    return this.boards.patchBoard(token, body);
  }
  @Post("manage/boards/:token/share-token") rotate(
    @Param("token") token: string,
  ) {
    return this.boards.rotate(token);
  }
  @Get("share/:token") share(@Param("token") token: string) {
    return this.boards.share(token);
  }
  @Get("share/:token/items/:id") async item(
    @Param("token") token: string,
    @Param("id") id: string,
  ) {
    const board = await this.boards.share(token);
    const item = board.items.find((i) => i.id === id);
    if (!item) throw new NotFoundException("品物が見つかりません");
    return item;
  }
}

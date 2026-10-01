import { AccessService } from "./access/access.service";
import { ItemsService } from "./items/items.service";
import { ItemsController } from "./items/items.controller";
import { RequestsService } from "./requests/requests.service";
import { RequestsController } from "./requests/requests.controller";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { BoardsController } from "./boards/boards.controller";
import { BoardsService } from "./boards/boards.service";
import { DatabaseService } from "./database/database.service";
import { ImageStorage, LocalImageStorage } from "./uploads/storage.service";
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 180 }])],
  controllers: [BoardsController, ItemsController, RequestsController],
  providers: [
    DatabaseService,
    AccessService,
    BoardsService,
    ItemsService,
    RequestsService,
    { provide: ImageStorage, useClass: LocalImageStorage },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

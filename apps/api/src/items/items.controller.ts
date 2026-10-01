import {
  Controller,
  Inject,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  UseInterceptors,
  UploadedFiles,
  StreamableFile,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { ItemsService } from "./items.service";
import { adminToken } from "../access/tokens";
@Controller()
export class ItemsController {
  constructor(@Inject(ItemsService) private items: ItemsService) {}
  @Post("manage/boards/:token/items") createItem(
    @Param("token") token: string,
    @Body() body: unknown,
  ) {
    return this.items.createItem(token, body);
  }
  @Patch("manage/items/:id") patchItem(
    @Param("id") id: string,
    @Headers("authorization") auth: string,
    @Body() body: unknown,
  ) {
    return this.items.patchItem(adminToken(auth), id, body);
  }
  @Delete("manage/items/:id") deleteItem(
    @Param("id") id: string,
    @Headers("authorization") auth: string,
  ) {
    return this.items.deleteItem(adminToken(auth), id);
  }
  @Post("manage/items/:id/images")
  @UseInterceptors(
    FilesInterceptor("images", 8, {
      limits: { fileSize: 5 * 1024 * 1024, files: 8, fields: 0 },
    }),
  )
  upload(
    @Param("id") id: string,
    @Headers("authorization") auth: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.items.upload(adminToken(auth), id, files);
  }
  @Delete("manage/items/:id/images/:imageId") deleteImage(
    @Param("id") id: string,
    @Param("imageId") imageId: string,
    @Headers("authorization") auth: string,
  ) {
    return this.items.deleteImage(adminToken(auth), id, imageId);
  }
  @Get("manage/boards/:token/items/:id/images/:imageId") async ownerImage(
    @Param("token") token: string,
    @Param("id") id: string,
    @Param("imageId") imageId: string,
  ) {
    return new StreamableFile(
      await this.items.image(token, id, imageId, true),
      { type: "image/webp" },
    );
  }
  @Get("share/:token/items/:id/images/:imageId") async image(
    @Param("token") token: string,
    @Param("id") id: string,
    @Param("imageId") imageId: string,
  ) {
    return new StreamableFile(
      await this.items.image(token, id, imageId, false),
      { type: "image/webp" },
    );
  }
}

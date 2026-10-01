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
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { RequestsService } from "./requests.service";
import { adminToken } from "../access/tokens";
@Controller()
export class RequestsController {
  constructor(@Inject(RequestsService) private requests: RequestsService) {}
  @Post("share/:token/items/:id/requests")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  apply(
    @Param("token") token: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.requests.apply(token, id, body);
  }
  @Get("requests/:token") application(@Param("token") token: string) {
    return this.requests.application(token);
  }
  @Delete("requests/:token") cancel(@Param("token") token: string) {
    return this.requests.cancel(token);
  }
  @Patch("manage/requests/:id") select(
    @Param("id") id: string,
    @Headers("authorization") auth: string,
    @Body() body: unknown,
  ) {
    return this.requests.select(adminToken(auth), id, body);
  }
}

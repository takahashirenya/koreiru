import { createHash, randomBytes } from "node:crypto";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
export function newToken() {
  return randomBytes(32).toString("base64url");
}
export function tokenHash(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new NotFoundException("URLが無効です");
  return createHash("sha256").update(token).digest("hex");
}
export function adminToken(header?: string) {
  if (!header?.startsWith("Bearer "))
    throw new UnauthorizedException("管理URLが必要です");
  return header.slice(7);
}

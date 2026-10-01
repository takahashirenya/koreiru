import { Injectable, BadRequestException } from "@nestjs/common";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
export abstract class ImageStorage {
  abstract save(file: Buffer): Promise<string>;
  abstract read(key: string): Promise<Buffer>;
  abstract remove(key: string): Promise<void>;
}
@Injectable()
export class LocalImageStorage extends ImageStorage {
  private root = resolve(process.env.STORAGE_PATH || "../../storage");
  async save(file: Buffer) {
    let buffer: Buffer;
    try {
      const input = sharp(file, { limitInputPixels: 40_000_000 });
      const info = await input.metadata();
      if (
        !["jpeg", "png", "webp"].includes(info.format || "") ||
        (info.pages || 1) > 1
      )
        throw new Error("format");
      buffer = await input
        .rotate()
        .resize(1800, 1800, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        "JPEG・PNG・WebPの静止画像を選んでください（最大5MB）",
      );
    }
    const key = `${randomUUID()}.webp`;
    await mkdir(this.root, { recursive: true });
    await writeFile(join(this.root, key), buffer);
    return key;
  }
  async read(key: string) {
    return readFile(join(this.root, key));
  }
  async remove(key: string) {
    await unlink(join(this.root, key)).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
  }
}

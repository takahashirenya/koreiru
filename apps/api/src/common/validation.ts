import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
export function parse<T extends z.ZodTypeAny>(
  schema: T,
  value: unknown,
): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new BadRequestException(
      result.error.issues.map((i) => i.message).join(" / "),
    );
  return result.data;
}
export const uuid = (id: string) => parse(z.string().uuid(), id);

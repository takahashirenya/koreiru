import "reflect-metadata";
import { config } from "dotenv";
import { resolve } from "node:path";
const projectRoot = resolve(__dirname, "../../..");
config({ path: resolve(projectRoot, ".env") });
process.env.STORAGE_PATH = resolve(
  projectRoot,
  process.env.STORAGE_PATH || "storage",
);
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configure } from "./common/configure";
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });
  configure(app);
  app.enableShutdownHooks();
  await app.listen(
    Number(process.env.PORT || 3001),
    process.env.HOST || "0.0.0.0",
  );
}
bootstrap().catch(() => {
  console.error(
    "APIを起動できません。DATABASE_URLとPostgreSQLの起動状態を確認してください。",
  );
  process.exit(1);
});

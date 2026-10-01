import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
config({ path: ".env" });
const url = new URL(
  process.env.DATABASE_URL ||
    "postgresql://koreiru:koreiru_local@localhost:5432/koreiru",
);
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("db:localはlocalhost専用です");
const directory = resolve(".local-db");
const pg = new EmbeddedPostgres({
  databaseDir: directory,
  port: Number(url.port || 5432),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  authMethod: "scram-sha-256",
  persistent: true,
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: console.error,
});
try {
  if (!existsSync(resolve(directory, "PG_VERSION"))) await pg.initialise();
  await pg.start();
  const client = pg.getPgClient();
  await client.connect();
  const dbName = decodeURIComponent(url.pathname.slice(1));
  if (!/^[A-Za-z0-9_]+$/.test(dbName))
    throw new Error("DB名は英数字と_で指定してください");
  const result = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName],
  );
  if (!result.rowCount) await pg.createDatabase(dbName);
  await client.end();
  console.log(
    `ローカルPostgreSQL起動済み: 127.0.0.1:${url.port || 5432} / ${dbName}（Ctrl+Cで停止）`,
  );
} catch (error) {
  console.error(error);
  await pg.stop().catch(() => {});
  process.exit(1);
}

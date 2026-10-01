import EmbeddedPostgres from "embedded-postgres";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
const directory = await mkdtemp(join(tmpdir(), "koreiru-test-db-"));
const port = 55439;
const url = `postgresql://koreiru:test_local@127.0.0.1:${port}/koreiru_test?schema=public`;
const pg = new EmbeddedPostgres({
  databaseDir: directory,
  port,
  user: "koreiru",
  password: "test_local",
  authMethod: "scram-sha-256",
  persistent: false,
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: console.error,
});
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", args, {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url, TEST_DATABASE_URL: url },
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`npm ${args.join(" ")} failed (${code})`)),
    );
  });
}
try {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("koreiru_test");
  await run(["run", "db:migrate"]);
  await run(["run", "test:integration"]);
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await pg.stop().catch(() => {});
  await rm(directory, { recursive: true, force: true });
}
process.exit(process.exitCode || 0);

import { config } from "dotenv";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
config({ path: resolve(root, ".env") });
const child = spawn(
  process.execPath,
  [
    resolve(root, "node_modules/prisma/build/index.js"),
    ...process.argv.slice(2),
    "--schema",
    resolve(root, "apps/api/prisma/schema.prisma"),
  ],
  { stdio: "inherit", env: process.env },
);
child.on("error", (e) => {
  console.error(e);
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 1));

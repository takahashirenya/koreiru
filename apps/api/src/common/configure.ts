import { INestApplication } from "@nestjs/common";
import { json } from "express";
export function configure(app: INestApplication) {
  app.setGlobalPrefix("api");
  app.enableCors({ origin: process.env.WEB_ORIGIN || "http://localhost:5173" });
  app.use(json({ limit: "32kb" }));
  app.use(
    (
      _req: unknown,
      res: { setHeader: (k: string, v: string) => void },
      next: () => void,
    ) => {
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      next();
    },
  );
}

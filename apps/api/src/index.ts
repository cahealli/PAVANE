import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { initDb } from "./db/index.js";
import projectsRouter from "./routes/projects.js";
import cardsRouter from "./routes/cards.js";
import runsRouter from "./routes/runs.js";

const app = new Hono();

app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"] }));

app.route("/api/projects", projectsRouter);
app.route("/api/cards", cardsRouter);
app.route("/api/runs", runsRouter);

app.get("/api/health", (c) => c.json({ status: "ok", version: "0.1.0" }));

initDb();

const PORT = parseInt(process.env.PORT ?? "3001");

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Pavane API running on http://localhost:${PORT}`);
});

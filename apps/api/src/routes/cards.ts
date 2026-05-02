import { Hono } from "hono";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { cards } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

const router = new Hono();

function now() {
  return new Date().toISOString();
}

router.get("/", async (c) => {
  const projectId = c.req.query("projectId");
  const rows = projectId
    ? await db.select().from(cards).where(eq(cards.projectId, projectId))
    : await db.select().from(cards);
  return c.json(rows);
});

router.post("/", async (c) => {
  const body = await c.req.json();
  const { projectId, title, objective } = body;

  if (!projectId || !title || !objective) {
    return c.json({ error: "projectId, title and objective are required" }, 400);
  }

  const id = nanoid();
  const ts = now();
  await db.insert(cards).values({
    id,
    projectId,
    title,
    objective,
    status: "backlog",
    createdAt: ts,
    updatedAt: ts,
  });

  const row = await db.query.cards.findFirst({ where: eq(cards.id, id) });
  return c.json(row, 201);
});

router.get("/:id", async (c) => {
  const row = await db.query.cards.findFirst({
    where: eq(cards.id, c.req.param("id")),
  });
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

router.patch("/:id", async (c) => {
  const body = await c.req.json();
  const allowed = ["title", "objective", "status"];
  const updates: Record<string, any> = { updatedAt: now() };
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  await db.update(cards).set(updates).where(eq(cards.id, c.req.param("id")));
  const row = await db.query.cards.findFirst({
    where: eq(cards.id, c.req.param("id")),
  });
  return c.json(row);
});

router.delete("/:id", async (c) => {
  await db.delete(cards).where(eq(cards.id, c.req.param("id")));
  return c.json({ ok: true });
});

export default router;

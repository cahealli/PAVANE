import { Hono } from "hono";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { runs, workerRuns, evidence, cards } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { executeRun } from "../runner/engine.js";
import { sseEmitter } from "../runner/emitter.js";
import type { SSEEvent } from "@pavane/shared";

const router = new Hono();

function now() {
  return new Date().toISOString();
}

router.post("/", async (c) => {
  const body = await c.req.json();
  const { cardId } = body;

  if (!cardId) return c.json({ error: "cardId is required" }, 400);

  const card = await db.query.cards.findFirst({ where: eq(cards.id, cardId) });
  if (!card) return c.json({ error: "Card not found" }, 404);

  const id = nanoid();
  const ts = now();

  await db.insert(runs).values({
    id,
    cardId,
    projectId: card.projectId,
    status: "queued",
    orchestratorProvider: "mock",
    orchestratorModel: "mock-v1",
    strategy: "single_worker",
    maxWorkers: 1,
    createdAt: ts,
    updatedAt: ts,
  });

  await db.update(cards).set({ status: "planning", updatedAt: ts }).where(eq(cards.id, cardId));

  // Kick off async — don't await
  executeRun(id).catch((err) => {
    console.error(`Run ${id} failed:`, err);
  });

  const row = await db.query.runs.findFirst({ where: eq(runs.id, id) });
  return c.json(row, 201);
});

router.get("/:id", async (c) => {
  const run = await db.query.runs.findFirst({
    where: eq(runs.id, c.req.param("id")),
  });
  if (!run) return c.json({ error: "Not found" }, 404);

  const workers = await db.select().from(workerRuns).where(eq(workerRuns.runId, run.id));
  const evs = await db.select().from(evidence).where(eq(evidence.runId, run.id));

  return c.json({ ...run, workers, evidence: evs });
});

router.get("/:id/events", async (c) => {
  const runId = c.req.param("id");

  const run = await db.query.runs.findFirst({ where: eq(runs.id, runId) });
  if (!run) return c.json({ error: "Not found" }, 404);

  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");
  c.header("Access-Control-Allow-Origin", "*");

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  function send(event: SSEEvent) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    writer.write(encoder.encode(data)).catch(() => {});
  }

  // Send current workers + evidence as initial state
  const workers = await db.select().from(workerRuns).where(eq(workerRuns.runId, runId));
  const evs = await db.select().from(evidence).where(eq(evidence.runId, runId));

  send({ type: "run_status", data: { runId, status: run.status as any } });
  for (const w of workers) {
    send({ type: "worker_status", data: { workerId: w.id, status: w.status as any, label: w.label as any } });
  }
  for (const ev of evs) {
    send({ type: "evidence", data: ev as any });
  }

  const listener = (event: SSEEvent) => send(event);
  sseEmitter.on(runId, listener);

  // Keep-alive ping
  const ping = setInterval(() => {
    writer.write(encoder.encode(": ping\n\n")).catch(() => {
      clearInterval(ping);
    });
  }, 15_000);

  c.req.raw.signal.addEventListener("abort", () => {
    clearInterval(ping);
    sseEmitter.off(runId, listener);
    writer.close().catch(() => {});
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

router.delete("/:id", async (c) => {
  const runId = c.req.param("id");
  await db.update(runs).set({ status: "failed", updatedAt: now() }).where(eq(runs.id, runId));
  await db
    .update(workerRuns)
    .set({ status: "cancelled", updatedAt: now() })
    .where(eq(workerRuns.runId, runId));
  sseEmitter.emit(runId, { type: "run_complete", data: { runId, status: "failed" } });
  return c.json({ ok: true });
});

export default router;

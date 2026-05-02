import { Hono } from "hono";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { projects } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { WorkspaceManager } from "../workspace/manager.js";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const router = new Hono();

function now() {
  return new Date().toISOString();
}

router.get("/", async (c) => {
  const rows = await db.select().from(projects).orderBy(projects.createdAt);
  const enriched = rows.map((p) => {
    const wsm = new WorkspaceManager(p.repoPath);
    const isGit = wsm.isGitRepo();
    const hasPavane = fs.existsSync(path.join(p.repoPath, p.pavaneConfigPath));
    return { ...p, isGitRepo: isGit, hasPavaneConfig: hasPavane };
  });
  return c.json(enriched);
});

router.post("/", async (c) => {
  const body = await c.req.json();
  const { name, repoPath, defaultBranch = "main" } = body;

  if (!name || !repoPath) {
    return c.json({ error: "name and repoPath are required" }, 400);
  }

  if (!fs.existsSync(repoPath)) {
    return c.json({ error: `Path does not exist: ${repoPath}` }, 400);
  }

  const wsm = new WorkspaceManager(repoPath);
  const branch = defaultBranch || wsm.getDefaultBranch();

  const id = nanoid();
  const ts = now();
  await db.insert(projects).values({
    id,
    name,
    repoPath,
    pavaneConfigPath: "PAVANE.md",
    defaultBranch: branch,
    createdAt: ts,
    updatedAt: ts,
  });

  const row = await db.query.projects.findFirst({ where: eq(projects.id, id) });
  return c.json(row, 201);
});

router.get("/:id", async (c) => {
  const row = await db.query.projects.findFirst({
    where: eq(projects.id, c.req.param("id")),
  });
  if (!row) return c.json({ error: "Not found" }, 404);

  const wsm = new WorkspaceManager(row.repoPath);
  const configPath = path.join(row.repoPath, row.pavaneConfigPath);
  let config = null;
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf-8");
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    try {
      config = fmMatch ? yaml.load(fmMatch[1]) : yaml.load(raw);
    } catch {}
  }

  return c.json({
    ...row,
    isGitRepo: wsm.isGitRepo(),
    hasPavaneConfig: fs.existsSync(configPath),
    config,
    recentFiles: wsm.getRecentFiles(),
  });
});

router.delete("/:id", async (c) => {
  await db.delete(projects).where(eq(projects.id, c.req.param("id")));
  return c.json({ ok: true });
});

export default router;

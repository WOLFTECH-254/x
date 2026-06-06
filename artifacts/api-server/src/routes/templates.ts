import { Router, type IRouter } from "express";
import { db, templatesTable } from "@workspace/db";
import { eq, ilike, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

router.get("/templates", async (req, res): Promise<void> => {
  const { category, search } = req.query as { category?: string; search?: string };

  let query = db.select().from(templatesTable).orderBy(templatesTable.createdAt);

  const templates = await db.select().from(templatesTable);
  let filtered = templates;

  if (category) {
    filtered = filtered.filter(t => t.category === category);
  }
  if (search) {
    const lower = search.toLowerCase();
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower)
    );
  }

  res.json(filtered.map(t => ({
    ...t,
    appJson: t.appJson as Record<string, unknown>,
  })));
});

router.get("/templates/categories", async (_req, res): Promise<void> => {
  const rows = await db.selectDistinct({ category: templatesTable.category }).from(templatesTable);
  res.json(rows.map(r => r.category));
});

router.get("/templates/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, id));
  if (!template) { res.status(404).json({ error: "Template not found" }); return; }

  res.json({ ...template, appJson: template.appJson as Record<string, unknown> });
});

router.post("/templates", requireAdmin, async (req, res): Promise<void> => {
  const { name, description, githubRepo, thumbnail, category, appJson } = req.body;
  if (!name || !description || !githubRepo || !category || !appJson) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [template] = await db.insert(templatesTable).values({
    name,
    description,
    githubRepo,
    thumbnail: thumbnail ?? null,
    category,
    appJson,
  }).returning();

  res.status(201).json({ ...template, appJson: template.appJson as Record<string, unknown> });
});

router.patch("/templates/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { name, description, githubRepo, thumbnail, category, appJson } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (githubRepo !== undefined) updates.githubRepo = githubRepo;
  if (thumbnail !== undefined) updates.thumbnail = thumbnail;
  if (category !== undefined) updates.category = category;
  if (appJson !== undefined) updates.appJson = appJson;

  const [template] = await db.update(templatesTable).set(updates).where(eq(templatesTable.id, id)).returning();
  if (!template) { res.status(404).json({ error: "Template not found" }); return; }

  res.json({ ...template, appJson: template.appJson as Record<string, unknown> });
});

router.delete("/templates/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(templatesTable).where(eq(templatesTable.id, id));
  res.sendStatus(204);
});

export default router;

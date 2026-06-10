import { Router, type IRouter } from "express";
import { db, deploymentsTable, templatesTable, usersTable, paymentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function formatTemplate(t: typeof templatesTable.$inferSelect) {
  return {
    id: t.id, name: t.name, description: t.description,
    githubRepo: t.githubRepo, thumbnail: t.thumbnail ?? null,
    category: t.category, appJson: t.appJson,
    isFree: t.isFree ?? false, price: t.price ?? 0,
    currency: t.currency ?? "KES", pairSiteUrl: t.pairSiteUrl ?? null,
    createdAt: t.createdAt,
  };
}

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  const deployments = await db.select().from(deploymentsTable);
  const templates = await db.select().from(templatesTable);
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.status, "success"));
  const onlineDeployments = deployments.filter(d => d.status === "online").length;
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  res.json({
    totalUsers: users.length, totalDeployments: deployments.length,
    onlineDeployments, totalTemplates: templates.length,
    totalRevenue, totalPayments: payments.length,
  });
});

router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role, createdAt: u.createdAt })));
});

router.get("/admin/deployments", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select({ deployment: deploymentsTable, templateName: templatesTable.name })
    .from(deploymentsTable)
    .leftJoin(templatesTable, eq(deploymentsTable.templateId, templatesTable.id))
    .orderBy(deploymentsTable.createdAt);
  res.json(rows.map(r => ({
    id: r.deployment.id, userId: r.deployment.userId, templateId: r.deployment.templateId,
    templateName: r.templateName ?? "Unknown", botName: r.deployment.botName,
    herokuAppId: r.deployment.herokuAppId ?? null, status: r.deployment.status,
    createdAt: r.deployment.createdAt, updatedAt: r.deployment.updatedAt,
  })));
});

router.get("/admin/payments", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select({ payment: paymentsTable, templateName: templatesTable.name, username: usersTable.username, email: usersTable.email })
    .from(paymentsTable)
    .leftJoin(templatesTable, eq(paymentsTable.templateId, templatesTable.id))
    .leftJoin(usersTable, eq(paymentsTable.userId, usersTable.id))
    .orderBy(desc(paymentsTable.createdAt));
  res.json(rows.map(r => ({ ...r.payment, templateName: r.templateName ?? "Unknown", username: r.username ?? "Unknown", email: r.email ?? "Unknown" })));
});

// â”€â”€ Edit template (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.patch("/admin/templates/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, description, githubRepo, thumbnail, category, appJson, isFree, price, currency, pairSiteUrl } = req.body;

  const [template] = await db.update(templatesTable).set({
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
    ...(githubRepo !== undefined && { githubRepo }),
    ...(thumbnail !== undefined && { thumbnail }),
    ...(category !== undefined && { category }),
    ...(appJson !== undefined && { appJson }),
    ...(isFree !== undefined && { isFree }),
    ...(price !== undefined && { price: isFree ? 0 : price }),
    ...(currency !== undefined && { currency }),
    ...(pairSiteUrl !== undefined && { pairSiteUrl }),
  }).where(eq(templatesTable.id, id)).returning();

  if (!template) { res.status(404).json({ error: "Template not found" }); return; }
  res.json(formatTemplate(template));
});

router.post("/admin/fetch-app-json", requireAdmin, async (req, res): Promise<void> => {
  const { repoUrl } = req.body;
  if (!repoUrl) { res.status(400).json({ error: "repoUrl is required" }); return; }
  try {
    const cleaned = repoUrl.replace(/\.git$/, "").trim();
    const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) { res.status(400).json({ error: "Must be a valid GitHub repository URL" }); return; }
    const [, owner, repo] = match;
    let appJson: Record<string, unknown> | null = null;
    for (const branch of ["main", "master"]) {
      try {
        const r = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/app.json`);
        if (r.ok) { appJson = await r.json() as Record<string, unknown>; break; }
      } catch { continue; }
    }
    if (!appJson) { res.status(400).json({ error: "Could not find app.json" }); return; }
    res.json({
      name: (appJson.name as string | undefined) ?? repo,
      description: (appJson.description as string | undefined) ?? null,
      logo: (appJson.logo as string | undefined) ?? null,
      keywords: (appJson.keywords as string[] | undefined) ?? [],
      env: (appJson.env as Record<string, unknown> | undefined) ?? {},
      raw: appJson,
    });
  } catch (err) {
    logger.error({ err }, "fetch-app-json error");
    res.status(500).json({ error: "Failed to fetch app.json" });
  }
});

router.post("/admin/deployments/:id/suspend", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db
    .select({ deployment: deploymentsTable, templateName: templatesTable.name })
    .from(deploymentsTable)
    .leftJoin(templatesTable, eq(deploymentsTable.templateId, templatesTable.id))
    .where(eq(deploymentsTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const logs = (row.deployment.logs as string[]) ?? [];
  const [updated] = await db.update(deploymentsTable)
    .set({ status: "suspended", logs: [...logs, `[${new Date().toISOString()}] Suspended by admin`] })
    .where(eq(deploymentsTable.id, id)).returning();
  res.json({ id: updated.id, status: updated.status, botName: updated.botName, templateName: row.templateName ?? "Unknown" });
});

export default router;

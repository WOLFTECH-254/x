import { Router, type IRouter } from "express";
import { db, deploymentsTable, templatesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function formatDeployment(d: typeof deploymentsTable.$inferSelect, templateName: string) {
  return {
    id: d.id,
    userId: d.userId,
    templateId: d.templateId,
    templateName,
    botName: d.botName,
    herokuAppId: d.herokuAppId ?? null,
    status: d.status,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

router.get("/deployments", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;

  const rows = await db
    .select({ deployment: deploymentsTable, templateName: templatesTable.name })
    .from(deploymentsTable)
    .leftJoin(templatesTable, eq(deploymentsTable.templateId, templatesTable.id))
    .where(eq(deploymentsTable.userId, user.id))
    .orderBy(deploymentsTable.createdAt);

  res.json(rows.map(r => formatDeployment(r.deployment, r.templateName ?? "Unknown")));
});

router.post("/deployments", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const { templateId, botName, envVars } = req.body;

  if (!templateId || !botName) {
    res.status(400).json({ error: "templateId and botName are required" });
    return;
  }

  const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, templateId));
  if (!template) { res.status(404).json({ error: "Template not found" }); return; }

  const [deployment] = await db.insert(deploymentsTable).values({
    userId: user.id,
    templateId,
    botName,
    status: "building",
    envVars: envVars ?? {},
    logs: [`[${new Date().toISOString()}] Deployment queued`, `[${new Date().toISOString()}] Building from ${template.githubRepo}...`],
  }).returning();

  // Simulate build completion after short delay (no real Heroku in demo)
  setTimeout(async () => {
    await db.update(deploymentsTable)
      .set({
        status: "online",
        herokuAppId: `junex-${deployment.id}-${botName.toLowerCase().replace(/\s+/g, "-")}`,
        logs: [
          ...(deployment.logs as string[]),
          `[${new Date().toISOString()}] Build succeeded`,
          `[${new Date().toISOString()}] Deploying to Heroku...`,
          `[${new Date().toISOString()}] Bot is now online!`,
        ],
      })
      .where(eq(deploymentsTable.id, deployment.id));
  }, 3000);

  res.status(201).json(formatDeployment(deployment, template.name));
});

router.get("/deployments/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({ deployment: deploymentsTable, templateName: templatesTable.name })
    .from(deploymentsTable)
    .leftJoin(templatesTable, eq(deploymentsTable.templateId, templatesTable.id))
    .where(and(eq(deploymentsTable.id, id), eq(deploymentsTable.userId, user.id)));

  if (!row) { res.status(404).json({ error: "Deployment not found" }); return; }
  res.json(formatDeployment(row.deployment, row.templateName ?? "Unknown"));
});

router.delete("/deployments/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(deploymentsTable).where(and(eq(deploymentsTable.id, id), eq(deploymentsTable.userId, user.id)));
  res.sendStatus(204);
});

async function updateStatus(req: typeof deploymentsTable.$inferSelect["userId"] extends number ? typeof req : never, res: Parameters<typeof router.post>[1], status: string): Promise<void> {
  // stub - handled inline below
}

router.post("/deployments/:id/start", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({ deployment: deploymentsTable, templateName: templatesTable.name })
    .from(deploymentsTable)
    .leftJoin(templatesTable, eq(deploymentsTable.templateId, templatesTable.id))
    .where(and(eq(deploymentsTable.id, id), eq(deploymentsTable.userId, user.id)));
  if (!row) { res.status(404).json({ error: "Deployment not found" }); return; }

  const existingLogs = (row.deployment.logs as string[]) ?? [];
  const [updated] = await db.update(deploymentsTable)
    .set({ status: "online", logs: [...existingLogs, `[${new Date().toISOString()}] Bot started`] })
    .where(eq(deploymentsTable.id, id))
    .returning();

  res.json(formatDeployment(updated, row.templateName ?? "Unknown"));
});

router.post("/deployments/:id/stop", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({ deployment: deploymentsTable, templateName: templatesTable.name })
    .from(deploymentsTable)
    .leftJoin(templatesTable, eq(deploymentsTable.templateId, templatesTable.id))
    .where(and(eq(deploymentsTable.id, id), eq(deploymentsTable.userId, user.id)));
  if (!row) { res.status(404).json({ error: "Deployment not found" }); return; }

  const existingLogs = (row.deployment.logs as string[]) ?? [];
  const [updated] = await db.update(deploymentsTable)
    .set({ status: "offline", logs: [...existingLogs, `[${new Date().toISOString()}] Bot stopped`] })
    .where(eq(deploymentsTable.id, id))
    .returning();

  res.json(formatDeployment(updated, row.templateName ?? "Unknown"));
});

router.post("/deployments/:id/restart", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({ deployment: deploymentsTable, templateName: templatesTable.name })
    .from(deploymentsTable)
    .leftJoin(templatesTable, eq(deploymentsTable.templateId, templatesTable.id))
    .where(and(eq(deploymentsTable.id, id), eq(deploymentsTable.userId, user.id)));
  if (!row) { res.status(404).json({ error: "Deployment not found" }); return; }

  const existingLogs = (row.deployment.logs as string[]) ?? [];
  const [updated] = await db.update(deploymentsTable)
    .set({ status: "online", logs: [...existingLogs, `[${new Date().toISOString()}] Bot restarted`] })
    .where(eq(deploymentsTable.id, id))
    .returning();

  res.json(formatDeployment(updated, row.templateName ?? "Unknown"));
});

router.get("/deployments/:id/logs", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [deployment] = await db
    .select()
    .from(deploymentsTable)
    .where(and(eq(deploymentsTable.id, id), eq(deploymentsTable.userId, user.id)));
  if (!deployment) { res.status(404).json({ error: "Deployment not found" }); return; }

  res.json({ lines: (deployment.logs as string[]) ?? [] });
});

router.patch("/deployments/:id/env", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { envVars } = req.body;
  if (!envVars || typeof envVars !== "object") {
    res.status(400).json({ error: "envVars must be an object" });
    return;
  }

  const [row] = await db
    .select({ deployment: deploymentsTable, templateName: templatesTable.name })
    .from(deploymentsTable)
    .leftJoin(templatesTable, eq(deploymentsTable.templateId, templatesTable.id))
    .where(and(eq(deploymentsTable.id, id), eq(deploymentsTable.userId, user.id)));
  if (!row) { res.status(404).json({ error: "Deployment not found" }); return; }

  const existingLogs = (row.deployment.logs as string[]) ?? [];
  const [updated] = await db.update(deploymentsTable)
    .set({ envVars, logs: [...existingLogs, `[${new Date().toISOString()}] Environment variables updated`] })
    .where(eq(deploymentsTable.id, id))
    .returning();

  res.json(formatDeployment(updated, row.templateName ?? "Unknown"));
});

export default router;

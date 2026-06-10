import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useParams } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useGetDeployment,
  useStartDeployment,
  useStopDeployment,
  useRestartDeployment,
  useDeleteDeployment,
  useUpdateDeploymentEnv,
  getGetDeploymentQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Terminal, Play, Square, RotateCcw, Trash2,
  ArrowLeft, Save, CheckCircle2, Bot, ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const API_BASE = "http://localhost:8080";

function authHeader() {
  const token = localStorage.getItem("junex_token");
  return { Authorization: `Bearer ${token}` };
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    online:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    offline:   "bg-slate-500/15 text-slate-400 border-slate-500/20",
    error:     "bg-red-500/15 text-red-400 border-red-500/20",
    building:  "bg-blue-500/15 text-blue-400 border-blue-500/20",
    queued:    "bg-amber-500/15 text-amber-400 border-amber-500/20",
    suspended: "bg-red-500/15 text-red-400 border-red-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg[status] ?? cfg.offline}`}>
      {status === "building"
        ? <Loader2 className="h-3 w-3 animate-spin" />
        : <span className={`h-1.5 w-1.5 rounded-full ${status === "online" ? "bg-emerald-400 animate-pulse" : "bg-current opacity-60"}`} />
      }
      {status}
    </span>
  );
}

function LogLine({ line }: { line: string }) {
  if (!line || line.trim() === "") return <div className="h-2" />;
  const isError   = line.includes("ERROR") || line.includes("FATAL");
  const isSuccess = line.includes("successful") || line.includes("online") || line.includes("succeeded") || line.includes("started") || line.includes("complete");
  const isWarning = line.includes("WARNING");
  return (
    <div className={`font-mono text-xs leading-6 px-1 ${
      isError ? "text-red-400" : isSuccess ? "text-emerald-400 font-medium" : isWarning ? "text-amber-400" : "text-slate-300"
    }`}>
      {line}
    </div>
  );
}

export default function DeploymentDetail() {
  const params = useParams() as { id?: string };
  const id = parseInt(params.id ?? "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [logs, setLogs] = useState<string[]>([]);
  const [deployStatus, setDeployStatus] = useState("building");
  const [redirecting, setRedirecting] = useState(false);
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  // Fetch deployment info
  const { data: deployment, isLoading } = useGetDeployment(id);

  useEffect(() => {
    if (deployment?.envVars) {
      setEnvVars(deployment.envVars as Record<string, string>);
    }
    if (deployment?.status) {
      setDeployStatus(deployment.status);
    }
  }, [deployment]);

  // Poll logs every 2.5s
  useEffect(() => {
    if (!id || isNaN(id)) return;

    async function fetchHerokuLogs() {
      try {
        const res = await fetch(`${API_BASE}/api/deployments/${id}/heroku-logs`, { headers: authHeader() });
        if (!res.ok) return null;
        const data = await res.json();
        return data.lines as string[];
      } catch { return null; }
    }

    async function fetchLogs() {
      try {
        const res = await fetch(`${API_BASE}/api/deployments/${id}/logs`, { headers: authHeader() });
        if (!res.ok) return;
        const data = await res.json();
        let lines: string[] = data.lines ?? [];
        // For online bots, also fetch live Heroku logs
        if (data.status === "online") {
          const herokuLines = await fetchHerokuLogs();
          if (herokuLines && herokuLines.length > 0) {
            lines = [...lines, "", "-- Live Heroku Logs --", ...herokuLines];
          }
        }
        setLogs(lines);
        setDeployStatus(data.status ?? "building");

        // Check if done and redirect
        if (data.status === "online" && !redirecting) {
          const last = lines.at(-1) ?? "";
          if (last.includes("Redirecting") || last.includes("successful") || last.includes("live")) {
            setRedirecting(true);
            setTimeout(() => setLocation("/dashboard"), 3000);
          }
        }
      } catch {}
    }

    fetchLogs();
    const interval = setInterval(fetchLogs, 2500);
    return () => clearInterval(interval);
  }, [id, redirecting]);

  // Auto-scroll
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetDeploymentQueryKey(id) });

  const startMutation   = useStartDeployment({ mutation: { onSuccess: () => { toast({ title: "Bot starting..." }); invalidate(); } } });
  const stopMutation    = useStopDeployment({ mutation: { onSuccess: () => { toast({ title: "Bot stopped" }); invalidate(); } } });
  const restartMutation = useRestartDeployment({ mutation: { onSuccess: () => { toast({ title: "Bot restarting..." }); invalidate(); } } });
  const deleteMutation  = useDeleteDeployment({ mutation: { onSuccess: () => { toast({ title: "Deployment deleted" }); setLocation("/dashboard"); } } });
  const updateEnvMutation = useUpdateDeploymentEnv({ mutation: { onSuccess: () => toast({ title: "Environment variables saved" }) } });

  const isBuilding = deployStatus === "building";

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!deployment) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Deployment not found.</p>
          <Button variant="link" asChild><Link href="/dashboard">Back to Dashboard</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-5xl px-4 py-8 mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{deployment.botName}</h1>
              <p className="text-xs text-muted-foreground">
                {deployment.templateName} &nbsp;Â·&nbsp; {format(new Date(deployment.createdAt), "MMM d, yyyy Â· h:mm a")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={deployStatus} />
            {deployment.herokuAppId && (
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={`https://${deployment.herokuAppId}.herokuapp.com`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> View App
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Building banner */}
        {isBuilding && !redirecting && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
            <Loader2 className="h-5 w-5 text-blue-400 animate-spin flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-400">Deployment in progress</p>
              <p className="text-xs text-muted-foreground">
                Your bot is being deployed to Heroku. This usually takes 2-5 minutes. You will be redirected automatically when complete.
              </p>
            </div>
          </div>
        )}

        {/* Success banner */}
        {redirecting && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-400">Deployment complete!</p>
              <p className="text-xs text-muted-foreground">Redirecting you to your dashboard...</p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {deployStatus === "error" && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/5">
            <div className="h-5 w-5 text-red-400 flex-shrink-0">!</div>
            <div>
              <p className="text-sm font-medium text-red-400">Deployment failed</p>
              <p className="text-xs text-muted-foreground">Check the logs below for details. You may retry from the templates page.</p>
            </div>
          </div>
        )}

        <Tabs defaultValue="logs">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="logs" className="gap-2">
                <Terminal className="h-4 w-4" /> Logs
              </TabsTrigger>
              <TabsTrigger value="settings" disabled={isBuilding}>
                Settings
              </TabsTrigger>
            </TabsList>

            {!isBuilding && (
              <div className="flex gap-2">
                {deployStatus === "offline" || deployStatus === "error" ? (
                  <Button size="sm" variant="outline" className="gap-1.5 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30"
                    disabled={startMutation.isPending} onClick={() => startMutation.mutate({ id })}>
                    <Play className="h-3.5 w-3.5" /> Start
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1.5 text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                    disabled={stopMutation.isPending || deployStatus !== "online"} onClick={() => stopMutation.mutate({ id })}>
                    <Square className="h-3.5 w-3.5" /> Stop
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-1.5"
                  disabled={restartMutation.isPending || deployStatus !== "online"} onClick={() => restartMutation.mutate({ id })}>
                  <RotateCcw className="h-3.5 w-3.5" /> Restart
                </Button>
              </div>
            )}
          </div>

          {/* â”€â”€ Logs â”€â”€ */}
          <TabsContent value="logs" className="mt-4">
            <Card className="border-border/40">
              <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-row items-center gap-2 space-y-0">
                <Terminal className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-medium">Live Deployment Logs</CardTitle>
                {isBuilding && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-blue-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> streaming
                  </span>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-[#060a10] rounded-b-xl h-[60vh] relative overflow-hidden">
                  <ScrollArea className="h-full w-full">
                    <div className="p-5 space-y-0">
                      {logs.length === 0 ? (
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
                          <Loader2 className="h-3 w-3 animate-spin" /> Waiting for logs...
                        </div>
                      ) : (
                        logs.map((line, i) => <LogLine key={i} line={line} />)
                      )}
                      <div ref={logsEndRef} className="h-2" />
                    </div>
                  </ScrollArea>
                  <div className="absolute top-0 left-0 w-full h-6 bg-gradient-to-b from-[#060a10] to-transparent pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-[#060a10] to-transparent pointer-events-none" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* â”€â”€ Settings â”€â”€ */}
          <TabsContent value="settings" className="mt-4 space-y-5">
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle className="text-base">Environment Variables</CardTitle>
                <CardDescription>Changes are pushed to Heroku and require a restart.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(envVars).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Input value={key} readOnly className="w-1/3 bg-muted font-mono text-xs" />
                    <Input value={val} type="password"
                      onChange={(e) => setEnvVars({ ...envVars, [key]: e.target.value })}
                      className="flex-1 font-mono text-xs" />
                    <Button variant="ghost" size="icon" className="text-destructive flex-shrink-0"
                      onClick={() => { const n = { ...envVars }; delete n[key]; setEnvVars(n); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-3 border-t border-border/40">
                  <Input placeholder="KEY" value={newKey} onChange={(e) => setNewKey(e.target.value)} className="w-1/3 font-mono text-xs" />
                  <Input placeholder="VALUE" value={newVal} onChange={(e) => setNewVal(e.target.value)} className="flex-1 font-mono text-xs" />
                  <Button variant="secondary" onClick={() => {
                    if (newKey && newVal) { setEnvVars({ ...envVars, [newKey]: newVal }); setNewKey(""); setNewVal(""); }
                  }}>Add</Button>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/40 justify-between py-4">
                <p className="text-xs text-muted-foreground">Encrypted at rest</p>
                <Button size="sm" className="gap-2"
                  onClick={() => updateEnvMutation.mutate({ id, data: { envVars } })}
                  disabled={updateEnvMutation.isPending}>
                  {updateEnvMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
                <CardDescription>Permanently deletes this deployment and its Heroku app.</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                      <Trash2 className="h-4 w-4" /> Delete Bot
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {deployment.botName}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently deletes the bot and its Heroku app. Cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground"
                        onClick={() => deleteMutation.mutate({ id })}>
                        Yes, delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}


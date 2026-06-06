import { Link } from "wouter";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGetDashboardSummary,
  useStartDeployment,
  useStopDeployment,
  useRestartDeployment,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { ProtectedRoute } from "@/components/protected-route";
import {
  Loader2,
  Server,
  Power,
  AlertCircle,
  Terminal,
  Play,
  Square,
  RotateCcw,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; dot: string; icon?: React.ReactNode }> = {
    online: { className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20", dot: "bg-emerald-500" },
    offline: { className: "bg-slate-500/15 text-slate-400 border-slate-500/20", dot: "bg-slate-400" },
    error: { className: "bg-red-500/15 text-red-500 border-red-500/20", dot: "bg-red-500" },
    building: { className: "bg-blue-500/15 text-blue-400 border-blue-500/20", dot: "" },
    queued: { className: "bg-amber-500/15 text-amber-500 border-amber-500/20", dot: "bg-amber-500" },
    suspended: { className: "bg-red-500/15 text-red-400 border-red-500/20", dot: "bg-red-400" },
  };
  const { className, dot } = config[status] ?? config.offline;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {status === "building" ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      )}
      {status}
    </span>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });

  const startMutation = useStartDeployment({
    mutation: { onSuccess: () => { toast({ title: "Bot starting" }); invalidate(); } },
  });
  const stopMutation = useStopDeployment({
    mutation: { onSuccess: () => { toast({ title: "Bot stopped" }); invalidate(); } },
  });
  const restartMutation = useRestartDeployment({
    mutation: { onSuccess: () => { toast({ title: "Bot restarting" }); invalidate(); } },
  });

  return (
    <ProtectedRoute>
      <Layout>
        <div className="container px-4 md:px-8 py-6 md:py-8 mx-auto max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 md:mb-8 gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
            <Button asChild size="sm" className="gap-2 flex-shrink-0">
              <Link href="/templates">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Deploy New Bot</span>
                <span className="sm:hidden">Deploy</span>
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : summary ? (
            <div className="space-y-6 md:space-y-8">
              {/* Stats — 2 cols on mobile, 4 on desktop */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {[
                  { label: "Total Deployments", value: summary.totalDeployments, icon: Server, color: "text-primary" },
                  { label: "Online", value: summary.onlineCount, icon: CheckCircle2, color: "text-emerald-500" },
                  { label: "Offline", value: summary.offlineCount, icon: XCircle, color: "text-slate-400" },
                  { label: "Errors", value: summary.errorCount, icon: AlertCircle, color: "text-red-500" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <Card key={label} className="border-border/40">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                      <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-2xl md:text-3xl font-bold">{value}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Deployments */}
              <div>
                <h2 className="text-lg md:text-xl font-bold mb-4">Your Bots</h2>
                {summary.recentDeployments.length === 0 ? (
                  <Card className="border-dashed border-border/60">
                    <CardContent className="flex flex-col items-center justify-center py-14 text-center px-4">
                      <Terminal className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                      <p className="text-base font-medium">No deployments yet</p>
                      <p className="text-sm text-muted-foreground mb-5 mt-1 max-w-xs">
                        Start by deploying a bot from our template gallery.
                      </p>
                      <Button asChild>
                        <Link href="/templates">Browse Templates</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {summary.recentDeployments.map((deployment) => (
                      <Card
                        key={deployment.id}
                        className="flex flex-col border-border/40 hover:border-primary/30 transition-colors"
                      >
                        <CardHeader className="pb-3 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <CardTitle className="text-base leading-snug">
                                <Link
                                  href={`/deployments/${deployment.id}`}
                                  className="hover:text-primary transition-colors truncate block"
                                >
                                  {deployment.botName}
                                </Link>
                              </CardTitle>
                              <CardDescription className="mt-0.5 text-xs truncate">
                                {deployment.templateName}
                              </CardDescription>
                            </div>
                            <StatusBadge status={deployment.status} />
                          </div>
                        </CardHeader>

                        <CardContent className="flex-1 px-4 pb-0">
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {format(new Date(deployment.createdAt), "MMM d, yyyy")}
                          </p>
                        </CardContent>

                        <div className="p-4 mt-3 border-t border-border/40 flex gap-2">
                          {deployment.status === "offline" || deployment.status === "error" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-1.5"
                              disabled={startMutation.isPending}
                              onClick={() => startMutation.mutate({ id: deployment.id })}
                            >
                              <Play className="h-3.5 w-3.5" /> Start
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10 hover:border-red-500/30"
                              disabled={stopMutation.isPending || deployment.status !== "online"}
                              onClick={() => stopMutation.mutate({ id: deployment.id })}
                            >
                              <Square className="h-3.5 w-3.5" /> Stop
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-1.5"
                            disabled={restartMutation.isPending || deployment.status !== "online"}
                            onClick={() => restartMutation.mutate({ id: deployment.id })}
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Restart
                          </Button>
                          <Button size="sm" variant="secondary" asChild className="flex-none px-3">
                            <Link href={`/deployments/${deployment.id}`}>View</Link>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

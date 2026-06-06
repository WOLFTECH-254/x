import { useState } from "react";
import { Link } from "wouter";
import { ProtectedRoute } from "@/components/protected-route";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useGetAdminStats,
  useListAdminUsers,
  useListAdminDeployments,
  useListTemplates,
  useDeleteTemplate,
  useSuspendDeployment,
  getListTemplatesQueryKey,
  getListAdminDeploymentsQueryKey,
  getGetAdminStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Loader2,
  Users,
  Server,
  LayoutTemplate,
  Activity,
  Ban,
  Trash2,
  Plus,
  Github,
  ExternalLink,
  Bot,
  ShieldCheck,
  TrendingUp,
  Zap,
  Eye,
  Globe,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; icon: React.ReactNode }> = {
    online: { className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20", icon: <CheckCircle2 className="h-3 w-3" /> },
    offline: { className: "bg-slate-500/15 text-slate-400 border-slate-500/20", icon: <XCircle className="h-3 w-3" /> },
    error: { className: "bg-red-500/15 text-red-500 border-red-500/20", icon: <AlertCircle className="h-3 w-3" /> },
    building: { className: "bg-blue-500/15 text-blue-400 border-blue-500/20", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    queued: { className: "bg-amber-500/15 text-amber-500 border-amber-500/20", icon: <Clock className="h-3 w-3" /> },
    suspended: { className: "bg-red-500/15 text-red-400 border-red-500/20", icon: <Ban className="h-3 w-3" /> },
  };
  const { className, icon } = config[status] ?? config.offline;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {icon}
      {status}
    </span>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  sub,
}: {
  title: string;
  value: number | undefined;
  icon: React.ElementType;
  gradient: string;
  sub?: string;
}) {
  return (
    <Card className="relative overflow-hidden border-border/40">
      <div className={`absolute inset-0 opacity-10 ${gradient}`} />
      <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${gradient} bg-opacity-20`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-3xl font-bold tracking-tight">
          {value === undefined ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : value}
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("templates");

  const { data: stats } = useGetAdminStats();
  const { data: users, isLoading: isLoadingUsers } = useListAdminUsers();
  const { data: deployments, isLoading: isLoadingDeployments } = useListAdminDeployments();
  const { data: templates, isLoading: isLoadingTemplates } = useListTemplates();

  const suspendMutation = useSuspendDeployment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Deployment suspended" });
        queryClient.invalidateQueries({ queryKey: getListAdminDeploymentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      },
    },
  });

  const deleteTemplateMutation = useDeleteTemplate({
    mutation: {
      onSuccess: () => {
        toast({ title: "Template deleted" });
        queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      },
    },
  });

  const onlineRate = stats
    ? stats.totalDeployments > 0
      ? Math.round((stats.onlineDeployments / stats.totalDeployments) * 100)
      : 0
    : null;

  return (
    <ProtectedRoute adminOnly>
      <Layout>
        <div className="min-h-screen bg-background">
          <div className="container px-4 md:px-8 py-8 mx-auto max-w-7xl space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">Admin Control Center</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
                <p className="text-muted-foreground mt-1">
                  Manage templates, monitor deployments, and oversee users.
                </p>
              </div>
              <Button asChild className="gap-2 shadow-lg shadow-primary/20">
                <Link href="/admin/templates/new">
                  <Plus className="h-4 w-4" /> Add Template
                </Link>
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Registered Users"
                value={stats?.totalUsers}
                icon={Users}
                gradient="bg-gradient-to-br from-violet-600 to-purple-800"
                sub="Total accounts on platform"
              />
              <StatCard
                title="Total Deployments"
                value={stats?.totalDeployments}
                icon={Server}
                gradient="bg-gradient-to-br from-blue-600 to-indigo-800"
                sub="All-time deployments"
              />
              <StatCard
                title="Live Right Now"
                value={stats?.onlineDeployments}
                icon={Activity}
                gradient="bg-gradient-to-br from-emerald-600 to-teal-800"
                sub={onlineRate !== null ? `${onlineRate}% uptime rate` : undefined}
              />
              <StatCard
                title="Bot Templates"
                value={stats?.totalTemplates}
                icon={LayoutTemplate}
                gradient="bg-gradient-to-br from-amber-600 to-orange-800"
                sub="Available in gallery"
              />
            </div>

            {/* Quick Action Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Add Template", icon: Plus, href: "/admin/templates/new", color: "text-primary" },
                { label: "View Deployments", icon: Eye, action: () => setActiveTab("deployments"), color: "text-blue-500" },
                { label: "Manage Users", icon: Users, action: () => setActiveTab("users"), color: "text-emerald-500" },
                { label: "Platform Health", icon: Zap, action: () => {}, color: "text-amber-500" },
              ].map((item) => (
                item.href ? (
                  <Link key={item.label} href={item.href}>
                    <Card className="cursor-pointer hover:border-primary/40 transition-colors group border-border/40">
                      <CardContent className="flex items-center gap-3 py-3 px-4">
                        <item.icon className={`h-4 w-4 ${item.color} group-hover:scale-110 transition-transform`} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </CardContent>
                    </Card>
                  </Link>
                ) : (
                  <Card
                    key={item.label}
                    className="cursor-pointer hover:border-primary/40 transition-colors group border-border/40"
                    onClick={item.action}
                  >
                    <CardContent className="flex items-center gap-3 py-3 px-4">
                      <item.icon className={`h-4 w-4 ${item.color} group-hover:scale-110 transition-transform`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </CardContent>
                  </Card>
                )
              ))}
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-muted/50 p-1">
                <TabsTrigger value="templates" className="gap-2">
                  <LayoutTemplate className="h-3.5 w-3.5" /> Templates
                  {templates && (
                    <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
                      {templates.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="deployments" className="gap-2">
                  <Server className="h-3.5 w-3.5" /> Deployments
                  {deployments && (
                    <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
                      {deployments.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-3.5 w-3.5" /> Users
                  {users && (
                    <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
                      {users.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ─── Templates Tab ─── */}
              <TabsContent value="templates" className="mt-6">
                {isLoadingTemplates ? (
                  <div className="flex h-40 items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                ) : templates && templates.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {templates.map((t) => {
                      const appJson = t.appJson as { env?: Record<string, unknown>; logo?: string };
                      const logo = t.thumbnail ?? appJson?.logo;
                      const envCount = Object.keys(appJson?.env ?? {}).length;
                      const deployCount = deployments?.filter((d) => d.templateId === t.id).length ?? 0;
                      return (
                        <Card
                          key={t.id}
                          data-testid={`template-card-${t.id}`}
                          className="group relative flex flex-col overflow-hidden border-border/40 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
                        >
                          {/* Logo strip */}
                          <div className="relative h-24 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                            {logo ? (
                              <img
                                src={logo}
                                alt={t.name}
                                className="h-16 w-16 rounded-xl object-cover shadow-md"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Bot className="h-8 w-8 text-primary/60" />
                              </div>
                            )}
                            <Badge
                              variant="outline"
                              className="absolute top-2 right-2 text-[10px] bg-background/80 backdrop-blur-sm"
                            >
                              {t.category}
                            </Badge>
                          </div>

                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">{t.name}</CardTitle>
                            <CardDescription className="text-xs line-clamp-2">{t.description}</CardDescription>
                          </CardHeader>

                          <CardContent className="flex-1 pb-3">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Server className="h-3 w-3" /> {deployCount} deploys
                              </span>
                              <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" /> {envCount} env vars
                              </span>
                            </div>
                            <a
                              href={t.githubRepo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground truncate transition-colors"
                            >
                              <Github className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{t.githubRepo.replace("https://github.com/", "")}</span>
                              <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
                            </a>
                          </CardContent>

                          <Separator />

                          <div className="flex items-center justify-between px-4 py-2">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(t.createdAt), "MMM d, yyyy")}
                            </span>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive h-7 px-2"
                                  data-testid={`delete-template-${t.id}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete <strong>{t.name}</strong> and cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteTemplateMutation.mutate({ id: t.id })}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </Card>
                      );
                    })}

                    {/* Add new card */}
                    <Link href="/admin/templates/new">
                      <Card className="h-full min-h-[220px] flex flex-col items-center justify-center border-dashed border-border/60 hover:border-primary/60 hover:bg-primary/5 cursor-pointer transition-all group">
                        <div className="p-4 rounded-full bg-primary/10 mb-3 group-hover:bg-primary/20 transition-colors">
                          <Plus className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                          Add New Template
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Auto-fetch from GitHub</p>
                      </Card>
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                    <LayoutTemplate className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm">No templates yet.</p>
                    <Button asChild size="sm">
                      <Link href="/admin/templates/new">
                        <Plus className="h-4 w-4 mr-2" /> Add First Template
                      </Link>
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* ─── Deployments Tab ─── */}
              <TabsContent value="deployments" className="mt-6">
                <Card className="border-border/40">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>All Deployments</CardTitle>
                        <CardDescription>Monitor and manage every instance on the platform.</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="h-4 w-4 text-emerald-500" />
                        <span>{stats?.onlineDeployments ?? 0} online</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoadingDeployments ? (
                      <div className="flex h-40 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-border/40">
                            <TableHead className="pl-6">Bot</TableHead>
                            <TableHead>Template</TableHead>
                            <TableHead>User ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Heroku App</TableHead>
                            <TableHead>Deployed</TableHead>
                            <TableHead className="text-right pr-6">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deployments?.map((dep) => (
                            <TableRow
                              key={dep.id}
                              data-testid={`deployment-row-${dep.id}`}
                              className="border-border/40 hover:bg-muted/30"
                            >
                              <TableCell className="pl-6">
                                <div className="font-medium">{dep.botName}</div>
                                <div className="text-xs text-muted-foreground font-mono">#{dep.id}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{dep.templateName}</Badge>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-xs text-muted-foreground">uid:{dep.userId}</span>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={dep.status} />
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px] block">
                                  {dep.herokuAppId ?? "—"}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {format(new Date(dep.createdAt), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                {dep.status !== "suspended" && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        data-testid={`suspend-deployment-${dep.id}`}
                                        disabled={suspendMutation.isPending}
                                      >
                                        <Ban className="h-3.5 w-3.5 mr-1.5" /> Suspend
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Suspend Deployment</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will suspend <strong>{dep.botName}</strong>. The user will not be able to
                                          restart it.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => suspendMutation.mutate({ id: dep.id })}
                                          className="bg-destructive hover:bg-destructive/90"
                                        >
                                          Suspend
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                                {dep.status === "suspended" && (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">Suspended</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!deployments || deployments.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                <Server className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                No deployments yet.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── Users Tab ─── */}
              <TabsContent value="users" className="mt-6">
                <Card className="border-border/40">
                  <CardHeader className="pb-4">
                    <CardTitle>Registered Users</CardTitle>
                    <CardDescription>All accounts on the JuneXDeployment platform.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoadingUsers ? (
                      <div className="flex h-40 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-border/40">
                            <TableHead className="pl-6">User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Deployments</TableHead>
                            <TableHead className="pr-6">Joined</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users?.map((u, idx) => {
                            const userDeployCount = deployments?.filter((d) => d.userId === u.id).length ?? 0;
                            const initials = u.username.slice(0, 2).toUpperCase();
                            return (
                              <TableRow
                                key={u.id}
                                data-testid={`user-row-${u.id}`}
                                className="border-border/40 hover:bg-muted/30"
                              >
                                <TableCell className="pl-6">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                        {initials}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium text-sm">{u.username}</div>
                                      <div className="text-xs text-muted-foreground font-mono">#{u.id}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={u.role === "admin" ? "default" : "outline"}
                                    className={u.role === "admin" ? "bg-primary/20 text-primary border-primary/30 hover:bg-primary/20" : ""}
                                  >
                                    {u.role === "admin" && <ShieldCheck className="h-3 w-3 mr-1" />}
                                    {u.role}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 text-sm">
                                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                                    <span>{userDeployCount}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground pr-6">
                                  {format(new Date(u.createdAt), "MMM d, yyyy")}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {(!users || users.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                No users registered yet.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

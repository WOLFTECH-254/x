import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { ProtectedRoute } from "@/components/protected-route";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useGetDeployment, 
  useGetDeploymentLogs, 
  useStartDeployment, 
  useStopDeployment, 
  useRestartDeployment, 
  useDeleteDeployment,
  useUpdateDeploymentEnv,
  getGetDeploymentQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Terminal, Play, Square, RotateCcw, Trash2, ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import { format } from "date-fns";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    online: "default",
    offline: "secondary",
    error: "destructive",
    building: "outline",
    queued: "outline",
    suspended: "destructive",
  };
  
  return (
    <Badge variant={variants[status] || "default"} className="capitalize">
      {status === 'online' && <span className="mr-1.5 flex h-2 w-2 rounded-full bg-green-500"></span>}
      {status === 'offline' && <span className="mr-1.5 flex h-2 w-2 rounded-full bg-gray-500"></span>}
      {status === 'error' && <span className="mr-1.5 flex h-2 w-2 rounded-full bg-red-500"></span>}
      {status === 'building' && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
      {status}
    </Badge>
  );
}

export default function DeploymentDetail({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: deployment, isLoading: isLoadingDeployment } = useGetDeployment(id, {
    query: { refetchInterval: 5000 } // Poll every 5s for status updates
  });

  const { data: logs, isLoading: isLoadingLogs } = useGetDeploymentLogs(id, {
    query: { refetchInterval: 3000 } // Poll logs every 3s
  });

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs]);

  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvVal, setNewEnvVal] = useState("");

  const updateEnvMutation = useUpdateDeploymentEnv({
    mutation: {
      onSuccess: () => {
        toast({ title: "Environment variables updated" });
      }
    }
  });

  const startMutation = useStartDeployment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Bot starting" });
        queryClient.invalidateQueries({ queryKey: getGetDeploymentQueryKey(id) });
      }
    }
  });

  const stopMutation = useStopDeployment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Bot stopped" });
        queryClient.invalidateQueries({ queryKey: getGetDeploymentQueryKey(id) });
      }
    }
  });

  const restartMutation = useRestartDeployment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Bot restarting" });
        queryClient.invalidateQueries({ queryKey: getGetDeploymentQueryKey(id) });
      }
    }
  });

  const deleteMutation = useDeleteDeployment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Deployment deleted" });
        setLocation("/dashboard");
      }
    }
  });

  const handleAddEnv = () => {
    if (newEnvKey && newEnvVal) {
      setEnvVars(prev => ({ ...prev, [newEnvKey]: newEnvVal }));
      setNewEnvKey("");
      setNewEnvVal("");
    }
  };

  const handleRemoveEnv = (key: string) => {
    const newEnv = { ...envVars };
    delete newEnv[key];
    setEnvVars(newEnv);
  };

  const handleSaveEnv = () => {
    updateEnvMutation.mutate({
      id,
      data: { envVars }
    });
  };

  if (isLoadingDeployment) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!deployment) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <h2 className="text-2xl font-bold">Deployment not found</h2>
        </div>
      </Layout>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="container px-4 md:px-8 py-8 mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-foreground">
                <Link href="/dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{deployment.botName}</h1>
                <p className="text-muted-foreground text-sm">
                  Template: {deployment.templateName} • Deployed on {format(new Date(deployment.createdAt), "PPp")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge status={deployment.status} />
              
              <div className="flex items-center bg-card rounded-md border p-1 gap-1">
                {(deployment.status === "offline" || deployment.status === "error") ? (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    disabled={startMutation.isPending}
                    onClick={() => startMutation.mutate({ id })}
                  >
                    <Play className="mr-2 h-4 w-4" /> Start
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    disabled={stopMutation.isPending || deployment.status !== "online"}
                    onClick={() => stopMutation.mutate({ id })}
                  >
                    <Square className="mr-2 h-4 w-4" /> Stop
                  </Button>
                )}
                <div className="w-[1px] h-4 bg-border mx-1"></div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  disabled={restartMutation.isPending || deployment.status !== "online"}
                  onClick={() => restartMutation.mutate({ id })}
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Restart
                </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="logs" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="logs">Console Logs</TabsTrigger>
              <TabsTrigger value="settings">Settings & Env</TabsTrigger>
            </TabsList>
            
            <TabsContent value="logs" className="m-0">
              <Card className="border-primary/20">
                <CardHeader className="py-3 px-4 bg-muted/50 border-b flex flex-row items-center space-y-0">
                  <Terminal className="h-4 w-4 mr-2" />
                  <CardTitle className="text-sm font-medium">Live Terminal Output</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="bg-[#0a0a0a] text-green-400 font-mono text-sm leading-relaxed p-4 h-[60vh] rounded-b-xl overflow-hidden relative">
                    <ScrollArea className="h-full w-full" ref={scrollRef}>
                      {isLoadingLogs ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading logs...
                        </div>
                      ) : !logs?.lines || logs.lines.length === 0 ? (
                        <div className="text-muted-foreground italic">No logs available.</div>
                      ) : (
                        <div className="pb-4">
                          {logs.lines.map((line, i) => (
                            <div key={i} className="whitespace-pre-wrap break-all hover:bg-white/5 px-1 rounded">
                              {line}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-[#0a0a0a] to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none"></div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="m-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Environment Variables</CardTitle>
                  <CardDescription>Manage secrets and configuration for your bot. Changing these requires a restart.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(envVars).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Input value={key} readOnly className="w-1/3 bg-muted font-mono text-xs" />
                      <Input value={val} type="password" onChange={(e) => setEnvVars({...envVars, [key]: e.target.value})} className="flex-1 font-mono text-xs" />
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveEnv(key)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Input 
                      placeholder="KEY" 
                      value={newEnvKey} 
                      onChange={(e) => setNewEnvKey(e.target.value)} 
                      className="w-1/3 font-mono text-xs" 
                    />
                    <Input 
                      placeholder="VALUE" 
                      value={newEnvVal} 
                      onChange={(e) => setNewEnvVal(e.target.value)} 
                      className="flex-1 font-mono text-xs" 
                    />
                    <Button onClick={handleAddEnv} variant="secondary">Add</Button>
                  </div>
                </CardContent>
                <CardFooter className="justify-between border-t py-4">
                  <p className="text-xs text-muted-foreground">Variables are encrypted at rest.</p>
                  <Button onClick={handleSaveEnv} disabled={updateEnvMutation.isPending}>
                    {updateEnvMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>

              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions for this deployment.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Delete Deployment</h4>
                      <p className="text-sm text-muted-foreground">Permanently remove this bot and all associated data.</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Delete Bot</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your bot deployment from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteMutation.mutate({ id })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Yes, delete bot
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ProtectedRoute } from "@/components/protected-route";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useGetTemplate, useCreateDeployment } from "@workspace/api-client-react";
import { PaymentModal } from "@/components/payment-modal";
import {
  Loader2,
  Github,
  ArrowLeft,
  Bot,
  ExternalLink,
  Zap,
  Lock,
  KeyRound,
  Tag,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TemplateDetail({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: template, isLoading } = useGetTemplate(id);

  const [botName, setBotName] = useState("");
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [showPayment, setShowPayment] = useState(false);
  const [paid, setPaid] = useState(false);

  const createMutation = useCreateDeployment({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Deployment started successfully" });
        setLocation(`/deployments/${data.id}`);
      },
      onError: (error) => {
        toast({
          title: "Deployment failed",
          description: error.data?.error ?? "Unknown error",
          variant: "destructive",
        });
      },
    },
  });

  function validateForm(): boolean {
    if (!botName.trim()) {
      toast({ title: "Bot name is required", variant: "destructive" });
      return false;
    }
    const env = template?.appJson?.env as Record<string, { required?: boolean; description?: string }> | undefined;
    for (const [key, config] of Object.entries(env ?? {})) {
      if (config.required !== false && !envVars[key]?.trim()) {
        toast({ title: `${key} is required`, variant: "destructive" });
        return false;
      }
    }
    return true;
  }

  function handleDeploy(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    if (!paid) {
      setShowPayment(true);
      return;
    }
    submitDeployment();
  }

  function submitDeployment() {
    createMutation.mutate({
      data: { templateId: id, botName: botName.trim(), envVars },
    });
  }

  function onPaymentSuccess() {
    setPaid(true);
    submitDeployment();
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!template) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-2xl font-bold">Template not found</h2>
          <Button asChild className="mt-4">
            <Link href="/templates">Browse Templates</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const appJson = template.appJson as {
    name?: string;
    logo?: string;
    env?: Record<string, { description?: string; required?: boolean; value?: string }>;
  };
  const logo = template.thumbnail ?? appJson?.logo;
  const envEntries = Object.entries(appJson?.env ?? {});

  return (
    <ProtectedRoute>
      <Layout>
        <div className="container px-4 md:px-8 py-8 mx-auto max-w-5xl">
          <Button variant="ghost" asChild className="mb-6 -ml-4 text-muted-foreground hover:text-foreground">
            <Link href="/templates">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Templates
            </Link>
          </Button>

          <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
            {/* Left: Info */}
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                {logo ? (
                  <img
                    src={logo}
                    alt={template.name}
                    className="h-16 w-16 rounded-xl object-cover border border-border shadow-md flex-shrink-0"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                    <Bot className="h-8 w-8 text-primary/60" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-2xl font-bold tracking-tight">{template.name}</h1>
                    <Badge variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{template.description}</p>
                </div>
              </div>

              {/* Repo */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Github className="h-4 w-4" /> Source Repository
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={template.githubRepo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline text-sm break-all"
                  >
                    {template.githubRepo}
                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                  </a>
                </CardContent>
              </Card>

              {/* Env preview */}
              {envEntries.length > 0 && (
                <Card className="border-border/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Required Configuration
                      <Badge variant="secondary" className="ml-1 text-xs">{envEntries.length} fields</Badge>
                    </CardTitle>
                    <CardDescription>
                      These environment variables will be injected into your bot at runtime.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {envEntries.map(([key, cfg]) => (
                        <div
                          key={key}
                          className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border border-border/30"
                        >
                          {key.toLowerCase().includes("token") ||
                          key.toLowerCase().includes("secret") ||
                          key.toLowerCase().includes("key") ? (
                            <Lock className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <KeyRound className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <code className="text-xs font-bold font-mono">{key}</code>
                              {cfg.required !== false && (
                                <Badge variant="destructive" className="text-[9px] h-3.5 px-1">req</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{cfg.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Deploy form */}
            <div>
              <Card className="sticky top-24 border-primary/20 shadow-xl shadow-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" /> Deploy Bot
                  </CardTitle>
                  <CardDescription>Configure and launch your bot instance.</CardDescription>
                </CardHeader>

                {paid && (
                  <div className="mx-6 mb-0 flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    Payment confirmed — ready to deploy
                  </div>
                )}

                <CardContent className="pt-4">
                  <form onSubmit={handleDeploy} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="botName" className="flex items-center gap-2">
                        <Bot className="h-3.5 w-3.5 text-primary" /> Bot Name
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="botName"
                        placeholder="my-awesome-bot"
                        value={botName}
                        onChange={(e) => setBotName(e.target.value)}
                        data-testid="input-bot-name"
                      />
                      <p className="text-xs text-muted-foreground">Used to identify your bot in the dashboard.</p>
                    </div>

                    {envEntries.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold">Environment Variables</h3>
                          {envEntries.map(([key, cfg]) => {
                            const isSecret =
                              key.toLowerCase().includes("token") ||
                              key.toLowerCase().includes("secret") ||
                              key.toLowerCase().includes("key") ||
                              key.toLowerCase().includes("password");
                            return (
                              <div key={key} className="space-y-1.5">
                                <Label
                                  htmlFor={`env-${key}`}
                                  className="flex items-center gap-1.5 text-xs font-semibold font-mono"
                                >
                                  {isSecret ? (
                                    <Lock className="h-3 w-3 text-amber-500" />
                                  ) : (
                                    <KeyRound className="h-3 w-3 text-primary" />
                                  )}
                                  {key}
                                  {cfg.required !== false && (
                                    <span className="text-destructive ml-0.5">*</span>
                                  )}
                                </Label>
                                <Input
                                  id={`env-${key}`}
                                  placeholder={cfg.value || cfg.description || ""}
                                  value={envVars[key] ?? ""}
                                  onChange={(e) =>
                                    setEnvVars((prev) => ({ ...prev, [key]: e.target.value }))
                                  }
                                  type={isSecret ? "password" : "text"}
                                  className="font-mono text-xs"
                                  data-testid={`env-input-${key}`}
                                />
                                {cfg.description && (
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {cfg.description}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    <Separator />

                    {!paid && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
                        <CreditCard className="h-4 w-4 text-primary flex-shrink-0" />
                        Deployment requires a hosting plan. Payment via Paystack.
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full gap-2"
                      size="lg"
                      disabled={createMutation.isPending}
                      data-testid="button-deploy"
                    >
                      {createMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : paid ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      {createMutation.isPending
                        ? "Deploying..."
                        : paid
                        ? "Deploy Now"
                        : "Choose Plan & Deploy"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <PaymentModal
          open={showPayment}
          onOpenChange={setShowPayment}
          onPaymentSuccess={onPaymentSuccess}
        />
      </Layout>
    </ProtectedRoute>
  );
}

import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
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
  Loader2, Github, ArrowLeft, Bot, ExternalLink, Zap, Lock,
  KeyRound, Tag, CreditCard, CheckCircle2, Gift,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "http://localhost:8080";

export default function TemplateDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: template, isLoading } = useGetTemplate(id);
  const [botName, setBotName] = useState("");
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [showPayment, setShowPayment] = useState(false);
  const [paid, setPaid] = useState(false);

  const token = localStorage.getItem("junex_token");

  const createMutation = useCreateDeployment({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Deployment started successfully" });
        setLocation(`/deployments/${data.id}`);
      },
      onError: (error: any) => {
        toast({ title: "Deployment failed", description: error.data?.error ?? "Unknown error", variant: "destructive" });
      },
    },
  });

  function validateForm(): boolean {
    if (!botName.trim()) { toast({ title: "Bot name is required", variant: "destructive" }); return false; }
    const env = template?.appJson?.env as Record<string, { required?: boolean }> | undefined;
    for (const [key, config] of Object.entries(env ?? {})) {
      if (config.required !== false && !envVars[key]?.trim()) {
        toast({ title: `${key} is required`, variant: "destructive" }); return false;
      }
    }
    return true;
  }

  function handleDeploy(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    if (!paid && !template?.isFree) { setShowPayment(true); return; }
    submitDeployment();
  }

  function submitDeployment() {
    createMutation.mutate({ data: { templateId: id, botName: botName.trim(), envVars } });
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!template) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Template not found.</p>
          <Button variant="link" asChild><Link href="/templates">Back to templates</Link></Button>
        </div>
      </Layout>
    );
  }

  const envFields = Object.entries(
    (template.appJson?.env as Record<string, { description?: string; required?: boolean }>) ?? {}
  );

  const priceDisplay = template.isFree
    ? "Free"
    : `${template.currency} ${((template.price ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <Layout>
      <div className="container max-w-3xl px-4 py-8 mx-auto">
        <Button variant="ghost" size="sm" className="mb-4" asChild>
          <Link href="/templates"><ArrowLeft className="h-4 w-4 mr-1" /> All Templates</Link>
        </Button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bot className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{template.name}</h1>
              <Badge variant="secondary">{template.category}</Badge>
              {template.isFree ? (
                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20 gap-1">
                  <Gift className="h-3 w-3" /> Free
                </Badge>
              ) : (
                <Badge className="bg-primary/15 text-primary border-primary/20 gap-1">
                  <CreditCard className="h-3 w-3" /> {priceDisplay}
                </Badge>
              )}
              {paid && !template.isFree && (
                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Paid
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">{template.description}</p>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <Button variant="outline" size="sm" asChild>
            <a href={template.githubRepo} target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4 mr-1.5" /> View Source
            </a>
          </Button>
        </div>

        <Separator className="mb-6" />

        {/* Deploy form */}
        <form onSubmit={handleDeploy} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4" /> Bot Configuration
              </CardTitle>
              <CardDescription>Give your bot a name and fill in required variables.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bot-name">Bot Name</Label>
                <Input
                  id="bot-name"
                  placeholder="my-awesome-bot"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                />
              </div>

              {envFields.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <KeyRound className="h-4 w-4" /> Environment Variables
                    </p>
                    {envFields.map(([key, config]) => (
                      <div key={key} className="space-y-1.5">
                        <Label htmlFor={key} className="flex items-center gap-1.5 text-xs">
                          <code className="text-primary">{key}</code>
                          {config.required !== false && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">required</Badge>
                          )}
                        </Label>
                        {config.description && (
                          <p className="text-xs text-muted-foreground">{config.description}</p>
                        )}
                        <Input
                          id={key}
                          placeholder={config.description ?? key}
                          value={envVars[key] ?? ""}
                          onChange={(e) => setEnvVars((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="font-mono text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment status */}
          {!template.isFree && !paid && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
              <Lock className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Payment required to deploy</p>
                <p className="text-xs text-muted-foreground">
                  This bot costs <strong>{priceDisplay}</strong>. You'll be prompted to pay before deploying.
                </p>
              </div>
            </div>
          )}
          {(template.isFree || paid) && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm font-medium">
                {template.isFree ? "Free template â€” ready to deploy!" : "Payment confirmed â€” ready to deploy!"}
              </p>
            </div>
          )}

          <Button type="submit" className="w-full gap-2" size="lg" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Deploying...</>
            ) : !paid && !template.isFree ? (
              <><CreditCard className="h-4 w-4" /> Pay & Deploy â€” {priceDisplay}</>
            ) : (
              <><Zap className="h-4 w-4" /> Deploy Bot</>
            )}
          </Button>
        </form>

        {/* Payment Modal */}
        <PaymentModal
          open={showPayment}
          onOpenChange={setShowPayment}
          onPaymentSuccess={() => { setPaid(true); setShowPayment(false); setTimeout(submitDeployment, 500); }}
          templateId={id}
          templateName={template.name}
          price={template.price ?? 0}
          currency={template.currency ?? "KES"}
          isFree={template.isFree ?? false}
        />
      </div>
    </Layout>
  );
}

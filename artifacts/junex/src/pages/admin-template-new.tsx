import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { ProtectedRoute } from "@/components/protected-route";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateTemplate, useFetchAppJson, getListTemplatesQueryKey } from "@workspace/api-client-react";
import {
  Loader2,
  ArrowLeft,
  Github,
  Sparkles,
  Bot,
  CheckCircle2,
  Zap,
  Image,
  Tag,
  Code2,
  AlertCircle,
  Server,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const templateSchema = z.object({
  name: z.string().min(2, { message: "Name is required (min 2 chars)" }),
  description: z.string().min(10, { message: "Description is required (min 10 chars)" }),
  githubRepo: z.string().min(5, { message: "GitHub URL is required" }),
  category: z.string().min(2, { message: "Category is required" }),
  thumbnail: z.string().optional().or(z.literal("")),
  appJson: z.string().min(2, { message: "Valid JSON is required" }),
});

type FormValues = z.infer<typeof templateSchema>;

interface EnvField {
  key: string;
  description: string;
  required?: boolean;
}

interface FetchedPreview {
  name: string;
  description: string | null;
  logo: string | null;
  keywords: string[];
  env: Record<string, { description?: string; required?: boolean }>;
  raw: Record<string, unknown>;
}

function isGithubUrl(url: string) {
  return /github\.com\/[^/]+\/[^/]+/.test(url.trim());
}

export default function AdminTemplateNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [repoInput, setRepoInput] = useState("");
  const [preview, setPreview] = useState<FetchedPreview | null>(null);
  const [envFields, setEnvFields] = useState<EnvField[]>([]);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      githubRepo: "",
      category: "",
      thumbnail: "",
      appJson: JSON.stringify(
        { name: "My Bot", env: { BOT_TOKEN: { description: "Your bot token", required: true } } },
        null,
        2
      ),
    },
  });

  const fetchMutation = useFetchAppJson({
    mutation: {
      onSuccess: (data) => {
        const raw = data as FetchedPreview;
        setPreview(raw);

        form.setValue("name", raw.name ?? "");
        form.setValue("description", raw.description ?? "");
        form.setValue("githubRepo", repoInput.replace(/\.git$/, "").trim());
        form.setValue("thumbnail", raw.logo ?? "");
        setManualImageUrl(raw.logo ?? "");

        if (raw.keywords?.length > 0) {
          const cats: Record<string, string> = {
            whatsapp: "WhatsApp", discord: "Discord", telegram: "Telegram", slack: "Slack",
          };
          const detected = raw.keywords.find((k) => cats[k.toLowerCase()]);
          form.setValue("category", detected ? cats[detected.toLowerCase()] : (raw.keywords[0] ?? ""));
        }

        form.setValue("appJson", JSON.stringify(raw.raw ?? {}, null, 2));

        const fields: EnvField[] = Object.entries(raw.env ?? {}).map(([key, val]) => ({
          key,
          description: val.description ?? "",
          required: val.required ?? false,
        }));
        setEnvFields(fields);
      },
      onError: (err: { data?: { error?: string } }) => {
        toast({
          title: "Could not fetch app.json",
          description: err?.data?.error ?? "Check the repo URL and try again",
          variant: "destructive",
        });
      },
    },
  });

  // Auto-fetch with 800ms debounce when URL looks like GitHub
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isGithubUrl(repoInput)) return;

    debounceRef.current = setTimeout(() => {
      fetchMutation.mutate({ data: { repoUrl: repoInput.trim() } });
    }, 800);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoInput]);

  // Sync manual image URL into form
  useEffect(() => {
    form.setValue("thumbnail", manualImageUrl);
  }, [manualImageUrl, form]);

  const createMutation = useCreateTemplate({
    mutation: {
      onSuccess: () => {
        toast({ title: "Template created successfully" });
        queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
        setLocation("/admin");
      },
      onError: (err: { data?: { error?: string } }) => {
        toast({ title: "Failed to create template", description: err?.data?.error ?? "Unknown error", variant: "destructive" });
      },
    },
  });

  function onSubmit(values: FormValues) {
    let parsedAppJson: Record<string, unknown>;
    try {
      parsedAppJson = JSON.parse(values.appJson);
    } catch {
      form.setError("appJson", { message: "Invalid JSON — check your syntax" });
      return;
    }
    createMutation.mutate({
      data: {
        name: values.name,
        description: values.description,
        githubRepo: values.githubRepo,
        category: values.category,
        thumbnail: values.thumbnail || null,
        appJson: parsedAppJson,
      },
    });
  }

  const displayImage = manualImageUrl || preview?.logo || null;

  return (
    <ProtectedRoute adminOnly>
      <Layout>
        <div className="container px-4 md:px-8 py-8 mx-auto max-w-4xl">
          <Button variant="ghost" asChild className="mb-6 -ml-4 text-muted-foreground hover:text-foreground">
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
            </Link>
          </Button>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Add New Template</h1>
            <p className="text-muted-foreground mt-1">
              Paste a GitHub URL — config is fetched automatically from the repo's <code className="text-xs bg-muted px-1 py-0.5 rounded">app.json</code>.
            </p>
          </div>

          {/* GitHub URL Input */}
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/20">
                  <Github className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">GitHub Repository</CardTitle>
                {fetchMutation.isPending && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                    <Loader2 className="h-3 w-3 animate-spin" /> Reading app.json…
                  </div>
                )}
                {preview && !fetchMutation.isPending && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-500 ml-auto">
                    <CheckCircle2 className="h-3 w-3" /> Config loaded
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 font-mono text-sm"
                  placeholder="https://github.com/WOLFTECH-254/silentwolf.git"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  data-testid="input-repo-url"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Paste any GitHub repo URL — the form will auto-fill once <code className="bg-muted px-1 py-0.5 rounded">app.json</code> is found.
              </p>
            </CardContent>
          </Card>

          {/* Live Preview Card — shown after fetch */}
          {preview && (
            <Card className="mb-6 border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <CardTitle className="text-base text-emerald-700 dark:text-emerald-400">Template Preview</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  {/* Bot image */}
                  <div className="flex-shrink-0">
                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt={preview.name}
                        className="h-20 w-20 rounded-xl object-cover border border-border shadow-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Bot className="h-10 w-10 text-primary/40" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg">{preview.name}</h3>
                      {preview.keywords.slice(0, 3).map((k) => (
                        <Badge key={k} variant="outline" className="text-xs">{k}</Badge>
                      ))}
                    </div>
                    {preview.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{preview.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-primary" />
                        {Object.keys(preview.env ?? {}).length} env vars
                      </span>
                      <a
                        href={repoInput.replace(/\.git$/, "")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        <Github className="h-3 w-3" />
                        View repo
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Env vars grid */}
                {envFields.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-emerald-500/20">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                      Detected Environment Variables
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {envFields.map((f) => (
                        <div
                          key={f.key}
                          className="flex items-start gap-2 p-2.5 rounded-lg bg-background/60 border border-border/40"
                        >
                          <Zap className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <code className="text-xs font-bold font-mono">{f.key}</code>
                              {f.required && (
                                <Badge variant="destructive" className="text-[9px] h-3.5 px-1">req</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{f.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Main form */}
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
              <CardDescription>
                {preview
                  ? "Auto-filled from app.json — review and adjust before saving."
                  : "Fill in manually, or paste a GitHub URL above to auto-populate."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Bot className="h-3.5 w-3.5 text-primary" /> Bot Name
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="WOLFBOT" data-testid="input-template-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Tag className="h-3.5 w-3.5 text-primary" /> Category
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="WhatsApp / Discord / Telegram" data-testid="input-category" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe what this bot does..."
                            className="resize-none"
                            rows={3}
                            data-testid="input-description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="githubRepo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Github className="h-3.5 w-3.5 text-primary" /> GitHub Repository URL
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://github.com/user/repo" data-testid="input-github-repo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Bot Image URL — manual + preview */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Image className="h-3.5 w-3.5 text-primary" /> Bot Logo / Image URL
                      {preview?.logo && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">auto-filled</Badge>
                      )}
                    </label>
                    <div className="flex gap-3 items-start">
                      <div className="flex-1 space-y-1.5">
                        <Input
                          placeholder="https://example.com/bot-logo.png"
                          value={manualImageUrl}
                          onChange={(e) => setManualImageUrl(e.target.value)}
                          data-testid="input-thumbnail"
                        />
                        <p className="text-xs text-muted-foreground">
                          Paste any direct image URL — auto-filled from app.json but can be changed.
                        </p>
                      </div>
                      {/* Image preview */}
                      <div className="flex-shrink-0 h-14 w-14 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden">
                        {displayImage ? (
                          <img
                            src={displayImage}
                            alt="Logo preview"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <Bot className="h-6 w-6 text-muted-foreground/40" />
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <FormField
                    control={form.control}
                    name="appJson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Code2 className="h-3.5 w-3.5 text-primary" /> app.json
                          {preview && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">auto-filled</Badge>
                          )}
                        </FormLabel>
                        <FormDescription>
                          Heroku app.json format. The{" "}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">env</code> section
                          drives the deployment configuration form.
                        </FormDescription>
                        <FormControl>
                          <Textarea
                            className="font-mono text-xs h-56 bg-muted/50 resize-none"
                            data-testid="input-app-json"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!preview && !fetchMutation.isPending && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      Paste a GitHub repo URL above — the form will auto-populate once app.json is found.
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full gap-2"
                    size="lg"
                    disabled={createMutation.isPending || fetchMutation.isPending}
                    data-testid="button-create-template"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Server className="h-4 w-4" />
                    )}
                    {createMutation.isPending ? "Creating Template..." : "Create Template"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

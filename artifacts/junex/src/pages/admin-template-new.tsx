import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateTemplate, useFetchAppJson, getListTemplatesQueryKey } from "@workspace/api-client-react";
import {
  Loader2, ArrowLeft, Github, Sparkles, Bot, CheckCircle2, Zap, Image,
  Tag, Code2, AlertCircle, Server, ExternalLink, DollarSign, Gift,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const CURRENCIES = ["KES", "USD", "GHS", "NGN", "UGX", "TZS", "ZAR"];

const templateSchema = z.object({
  name: z.string().min(2, { message: "Name is required (min 2 chars)" }),
  description: z.string().min(10, { message: "Description is required (min 10 chars)" }),
  githubRepo: z.string().min(5, { message: "GitHub URL is required" }),
  category: z.string().min(2, { message: "Category is required" }),
  thumbnail: z.string().optional().or(z.literal("")),
  appJson: z.string().min(2, { message: "Valid JSON is required" }),
  isFree: z.boolean().default(false),
  price: z.number().min(0).default(0),
  currency: z.string().default("KES"),
});

type FormValues = z.infer<typeof templateSchema>;

interface EnvField {
  key: string;
  description: string;
  required?: boolean;
}

interface FetchedPreview {
  name: string;
  description: string;
  logo?: string;
  keywords?: string[];
  env?: Record<string, { description?: string; required?: boolean }>;
}

export default function AdminTemplateNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [repoUrl, setRepoUrl] = useState("");
  const [preview, setPreview] = useState<FetchedPreview | null>(null);
  const [envFields, setEnvFields] = useState<EnvField[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFreeToggle, setIsFreeToggle] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "", description: "", githubRepo: "", category: "",
      thumbnail: "", appJson: "{}", isFree: false, price: 0, currency: "KES",
      pairSiteUrl: "",
      pairSiteUrl: "",
    },
  });

  const fetchAppJson = useFetchAppJson({
    mutation: {
      onSuccess: (data) => {
        setPreview(data as FetchedPreview);
        setFetchError(null);
        form.setValue("name", data.name ?? "");
        form.setValue("description", (data.description as string) ?? "");
        form.setValue("appJson", JSON.stringify(data.raw, null, 2));
        const env = (data.env as Record<string, { description?: string; required?: boolean }>) ?? {};
        setEnvFields(
          Object.entries(env).map(([key, val]) => ({
            key,
            description: val.description ?? "",
            required: val.required !== false,
          }))
        );
      },
      onError: () => {
        setFetchError("Could not fetch app.json. Make sure the repo is public and has an app.json.");
        setPreview(null);
      },
    },
  });

  const createTemplate = useCreateTemplate({
    mutation: {
      onSuccess: () => {
        toast({ title: "Template created successfully!" });
        queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
        setLocation("/admin");
      },
      onError: (error: any) => {
        toast({
          title: "Failed to create template",
          description: error.data?.error ?? "Unknown error",
          variant: "destructive",
        });
      },
    },
  });

  useEffect(() => {
    form.setValue("isFree", isFreeToggle);
    if (isFreeToggle) { form.setValue("price", 0); }
  }, [isFreeToggle]);

  function handleRepoChange(url: string) {
    setRepoUrl(url);
    form.setValue("githubRepo", url);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (url.includes("github.com")) {
      debounceRef.current = setTimeout(() => {
        fetchAppJson.mutate({ data: { repoUrl: url } });
      }, 800);
    }
  }

  function onSubmit(values: FormValues) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(values.appJson);
    } catch {
      toast({ title: "Invalid JSON in App JSON field", variant: "destructive" });
      return;
    }
    createTemplate.mutate({
      data: {
        name: values.name,
        description: values.description,
        githubRepo: values.githubRepo,
        category: values.category,
        thumbnail: values.thumbnail || undefined,
        appJson: parsed as Record<string, unknown>,
        isFree: values.isFree,
        price: values.isFree ? 0 : Math.round((values.price ?? 0) * 100), // store in cents
        currency: values.currency,
      },
    });
  }

  return (
    <Layout>
      <div className="container max-w-3xl px-4 py-8 mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Add New Template</h1>
            <p className="text-muted-foreground text-sm">Paste a GitHub repo URL to auto-fill from app.json</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* â”€â”€ GitHub Repo â”€â”€ */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Github className="h-4 w-4" /> GitHub Repository
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <FormField control={form.control} name="githubRepo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repository URL</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="https://github.com/owner/repo"
                          className="pl-9 font-mono text-sm"
                          value={repoUrl}
                          onChange={(e) => handleRepoChange(e.target.value)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {fetchAppJson.isPending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Fetching app.json...
                  </div>
                )}
                {fetchError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" /> {fetchError}
                  </div>
                )}
                {preview && (
                  <div className="flex items-center gap-2 text-sm text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" /> app.json loaded â€” fields auto-filled
                  </div>
                )}
              </CardContent>
            </Card>

            {/* â”€â”€ Basic Info â”€â”€ */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bot className="h-4 w-4" /> Template Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder="My Discord Bot" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="What does this bot do?" rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl><Input placeholder="e.g. Moderation" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="thumbnail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thumbnail URL <span className="text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* â”€â”€ Pricing â”€â”€ */}
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4 text-primary" /> Pricing
                </CardTitle>
                <CardDescription>Set whether this template is free or paid</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20">
                  <div className="flex items-center gap-3">
                    <Gift className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Free Template</p>
                      <p className="text-xs text-muted-foreground">Users can deploy without paying</p>
                    </div>
                  </div>
                  <Switch
                    checked={isFreeToggle}
                    onCheckedChange={setIsFreeToggle}
                  />
                </div>

                {!isFreeToggle && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="price" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              placeholder="0.00"
                              className="pl-9"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">Enter the full price (e.g. 500 = 500 KES)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="currency" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CURRENCIES.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}

                {!isFreeToggle && form.watch("price") > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Users will pay <strong className="mx-1">{form.watch("currency")} {form.watch("price")}</strong> before deploying this bot
                  </div>
                )}
              </CardContent>
            </Card>

            {/* â”€â”€ Env Variables Preview â”€â”€ */}
            {envFields.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Code2 className="h-4 w-4" /> Environment Variables
                    <Badge variant="secondary" className="ml-auto text-xs">{envFields.length} vars</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {envFields.map((f) => (
                      <div key={f.key} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/40">
                        <code className="text-xs font-mono text-primary mt-0.5">{f.key}</code>
                        <span className="text-xs text-muted-foreground flex-1">{f.description}</span>
                        {f.required && <Badge variant="outline" className="text-[10px] px-1.5">required</Badge>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* â”€â”€ App JSON â”€â”€ */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Code2 className="h-4 w-4" /> App JSON
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField control={form.control} name="appJson" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        className="font-mono text-xs min-h-[180px] resize-y"
                        placeholder='{"name":"my-bot","env":{}}'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Button type="submit" className="w-full gap-2" disabled={createTemplate.isPending}>
              {createTemplate.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Create Template</>
              )}
            </Button>
          </form>
        </Form>
      </div>
    </Layout>
  );
}



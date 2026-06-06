import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useListTemplates, useListTemplateCategories } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Github, Bot, ExternalLink, Zap } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

export default function Templates() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const debouncedSearch = useDebounce(search, 500);

  const { data: templates, isLoading } = useListTemplates({
    search: debouncedSearch || undefined,
    category,
  });

  const { data: categories } = useListTemplateCategories();

  return (
    <Layout>
      <div className="container px-4 md:px-8 py-6 md:py-10 mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Bot Templates</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Deploy production-ready bots in seconds.
          </p>
        </div>

        {/* Search + filter row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search templates..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none flex-wrap sm:flex-nowrap">
            <Badge
              variant={!category ? "default" : "outline"}
              className="cursor-pointer text-xs py-1.5 px-3 whitespace-nowrap hover:bg-primary/90 transition-colors flex-shrink-0"
              onClick={() => setCategory(undefined)}
            >
              All
            </Badge>
            {categories?.map((cat) => (
              <Badge
                key={cat}
                variant={category === cat ? "default" : "outline"}
                className="cursor-pointer text-xs py-1.5 px-3 whitespace-nowrap hover:border-primary/60 transition-colors flex-shrink-0"
                onClick={() => setCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : templates?.length === 0 ? (
          <div className="text-center py-20 border rounded-xl border-dashed bg-muted/20">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-base font-medium text-muted-foreground">No templates found</p>
            <Button variant="link" onClick={() => { setSearch(""); setCategory(undefined); }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {templates?.map((template) => {
              const appJson = template.appJson as { logo?: string; env?: Record<string, unknown> };
              const img = template.thumbnail ?? appJson?.logo;
              const envCount = Object.keys(appJson?.env ?? {}).length;
              return (
                <div
                  key={template.id}
                  className="group flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
                >
                  {/* Image area — fixed height, object-contain so logo never crops */}
                  <div className="relative h-52 bg-black flex items-center justify-center overflow-hidden">
                    {img ? (
                      <img
                        src={img}
                        alt={template.name}
                        className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).parentElement!.innerHTML =
                            `<div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a48.11 48.11 0 01-7.667 3.054M19.8 15l-7.8 4.5" /></svg></div>`;
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Bot className="h-10 w-10 text-primary/40" />
                      </div>
                    )}

                    {/* Category badge overlay */}
                    <div className="absolute top-3 right-3">
                      <Badge
                        variant="secondary"
                        className="text-[11px] bg-black/60 text-white border-white/20 backdrop-blur-sm"
                      >
                        {template.category}
                      </Badge>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col flex-1 p-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-bold text-base leading-snug line-clamp-1">{template.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1 leading-relaxed">
                      {template.description}
                    </p>

                    <div className="flex items-center justify-between mb-4">
                      <a
                        href={template.githubRepo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-[70%]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Github className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">
                          {template.githubRepo.replace("https://github.com/", "")}
                        </span>
                        <ExternalLink className="h-2.5 w-2.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                      {envCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                          <Zap className="h-3 w-3 text-primary" />
                          {envCount} vars
                        </span>
                      )}
                    </div>

                    <Button className="w-full" asChild>
                      <Link href={`/templates/${template.id}`}>Deploy</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

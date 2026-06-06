import { Link } from "wouter";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Terminal, Zap, Shield, Globe, ArrowRight, CheckCircle2 } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Deployments",
    desc: "Go from template to live in seconds. Our automated pipeline handles Heroku provisioning end-to-end.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Terminal,
    title: "Real-time Logs",
    desc: "Stream live console logs directly to your dashboard. Debug issues instantly without leaving the platform.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    desc: "Your tokens and API keys are encrypted and injected securely into containers at runtime.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Globe,
    title: "Always Online",
    desc: "Our infrastructure keeps your bots running 24/7 with automatic restarts and health monitoring.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
];

const highlights = [
  "No DevOps knowledge required",
  "One-click template deployments",
  "Full environment variable control",
  "Start, stop & restart anytime",
];

export default function Home() {
  return (
    <Layout>
      <div className="flex flex-col">
        {/* Hero */}
        <section className="relative overflow-hidden bg-background pt-16 pb-20 md:pt-24 md:pb-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background pointer-events-none" />
          <div className="container relative z-10 px-4 md:px-8 mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold mb-6 md:mb-8">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Now live — deploy your first bot free
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-4 md:mb-6 leading-[1.1]">
                Mission Control for <br className="hidden sm:block" />
                <span className="text-primary">Discord Bots</span>
              </h1>

              <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-10 px-2">
                Deploy, manage, and scale your bots without touching Heroku directly. A precise, powerful cockpit for bot operators.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0">
                <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8 gap-2 shadow-lg shadow-primary/30" asChild>
                  <Link href="/register">
                    Get Started Free <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-12 px-8" asChild>
                  <Link href="/templates">Browse Templates</Link>
                </Button>
              </div>

              {/* Highlights row */}
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 md:mt-10">
                {highlights.map((h) => (
                  <span key={h} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    {h}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 md:py-24 bg-card/50 border-t border-border/40">
          <div className="container px-4 md:px-8 mx-auto max-w-6xl">
            <div className="text-center mb-10 md:mb-16 px-2">
              <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">
                Engineered for Reliability
              </h2>
              <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">
                Everything you need to keep your bots online and your community happy.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {features.map(({ icon: Icon, title, desc, color, bg }) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className="p-5 md:p-6 rounded-2xl bg-background border border-border/50 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className={`inline-flex p-2.5 rounded-xl ${bg} mb-4`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <h3 className="text-base font-bold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container px-4 md:px-8 mx-auto max-w-3xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to deploy your bot?</h2>
            <p className="text-muted-foreground mb-8 text-sm md:text-base">
              Join and get your bot live in under a minute.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="w-full sm:w-auto gap-2 shadow-lg shadow-primary/20" asChild>
                <Link href="/register">
                  Start Deploying <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="/templates">View Templates</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

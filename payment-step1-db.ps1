# ============================================================
# create-wallet-page.ps1
# Creates user Payments/Wallet page + updates navbar
# Run from: C:\Users\user\OneDrive\Desktop\JUNEX\June-Theme-UI
# ============================================================

$frontendSrc = "artifacts\junex\src"

Write-Host "`n[1/3] Creating payments/wallet page..." -ForegroundColor Cyan

$walletPage = @'
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import {
  Loader2, CreditCard, CheckCircle2, Clock, XCircle,
  Smartphone, Receipt, ArrowRight, ShoppingBag,
} from "lucide-react";

const API_BASE = "http://localhost:8080";

interface Payment {
  id: number;
  templateId: number;
  templateName: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  paidAt: string | null;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; icon: React.ReactNode }> = {
    success: {
      className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    pending: {
      className: "bg-amber-500/15 text-amber-500 border-amber-500/20",
      icon: <Clock className="h-3 w-3" />,
    },
    failed: {
      className: "bg-red-500/15 text-red-500 border-red-500/20",
      icon: <XCircle className="h-3 w-3" />,
    },
  };
  const { className, icon } = config[status] ?? config.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {icon} {status}
    </span>
  );
}

function MethodIcon({ method }: { method: string }) {
  if (method === "mpesa") return <Smartphone className="h-4 w-4 text-primary" />;
  return <CreditCard className="h-4 w-4 text-primary" />;
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function WalletPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("junex_token");
    fetch(`${API_BASE}/api/payments/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { setPayments(Array.isArray(data) ? data : []); })
      .catch(() => setPayments([]))
      .finally(() => setIsLoading(false));
  }, []);

  const totalSpent = payments
    .filter((p) => p.status === "success")
    .reduce((sum, p) => sum + p.amount, 0);

  const successCount = payments.filter((p) => p.status === "success").length;
  const pendingCount = payments.filter((p) => p.status === "pending").length;

  return (
    <Layout>
      <div className="container max-w-4xl px-4 py-8 mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Payments & Wallet</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your payment history and transaction records
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-border/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Spent</CardTitle>
              <Receipt className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl md:text-2xl font-bold text-primary">
                {payments.length > 0 && payments[0]?.currency
                  ? formatAmount(totalSpent, payments.find(p => p.status === "success")?.currency ?? "KES")
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{successCount} successful payment{successCount !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Bots Unlocked</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl md:text-2xl font-bold">{successCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Ready to deploy</p>
            </CardContent>
          </Card>

          <Card className="border-border/40 col-span-2 md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Pending</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl md:text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting confirmation</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions */}
        <Card className="border-border/40">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Transaction History
            </CardTitle>
            <CardDescription>All your payment records</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <p className="font-medium text-muted-foreground">No payments yet</p>
                <p className="text-sm text-muted-foreground mt-1 mb-5">
                  Browse templates and deploy your first bot.
                </p>
                <Button asChild size="sm">
                  <Link href="/templates">Browse Templates <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center gap-4 px-4 md:px-6 py-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Icon */}
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MethodIcon method={payment.method} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{payment.templateName}</p>
                        <StatusBadge status={payment.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {payment.reference}
                        </p>
                        <span className="text-xs text-muted-foreground capitalize hidden sm:inline">
                          {payment.method === "mpesa" ? "M-Pesa" : "Card"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(payment.createdAt), "MMM d, yyyy · h:mm a")}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className={`font-semibold text-sm ${payment.status === "success" ? "text-foreground" : "text-muted-foreground"}`}>
                        {formatAmount(payment.amount, payment.currency)}
                      </p>
                      {payment.status === "success" && (
                        <Link
                          href="/templates"
                          className="text-xs text-primary hover:underline mt-0.5 block"
                        >
                          Deploy
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
'@

Set-Content -Path "$frontendSrc\pages\wallet.tsx" -Value $walletPage -Encoding UTF8
Write-Host "  wallet.tsx created." -ForegroundColor Green

# ============================================================
Write-Host "`n[2/3] Adding /wallet route to App.tsx..." -ForegroundColor Cyan

$appTsx = @'
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import { setBaseUrl } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Templates from "@/pages/templates";
import TemplateDetail from "@/pages/template-detail";
import DeploymentDetail from "@/pages/deployment-detail";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminTemplateNew from "@/pages/admin-template-new";
import OAuthCallback from "@/pages/oauth-callback";
import WalletPage from "@/pages/wallet";

setBaseUrl("http://localhost:8080");

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/oauth-callback" component={OAuthCallback} />

      {/* Protected user routes */}
      <Route path="/dashboard">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/templates">
        <ProtectedRoute><Templates /></ProtectedRoute>
      </Route>
      <Route path="/templates/:id">
        {() => <ProtectedRoute><TemplateDetail /></ProtectedRoute>}
      </Route>
      <Route path="/deployments/:id">
        {() => <ProtectedRoute><DeploymentDetail /></ProtectedRoute>}
      </Route>
      <Route path="/wallet">
        <ProtectedRoute><WalletPage /></ProtectedRoute>
      </Route>

      {/* Admin only */}
      <Route path="/admin">
        <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
      </Route>
      <Route path="/admin/templates/new">
        <ProtectedRoute adminOnly><AdminTemplateNew /></ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="junex-theme">
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
'@

Set-Content -Path "$frontendSrc\App.tsx" -Value $appTsx -Encoding UTF8
Write-Host "  App.tsx updated with /wallet route." -ForegroundColor Green

# ============================================================
Write-Host "`n[3/3] Updating navbar to include Wallet link..." -ForegroundColor Cyan

$navbar = @'
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import {
  Moon, Sun, Terminal, Menu, X,
  LayoutDashboard, Grid3X3, ShieldCheck,
  LogOut, LogIn, UserPlus, Wallet,
} from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/templates", label: "Templates", icon: Grid3X3 },
    ...(user ? [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/wallet", label: "Payments", icon: Wallet },
    ] : []),
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  function isActive(href: string) {
    return location === href || location.startsWith(href + "/");
  }

  return (
    <>
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 max-w-screen-2xl items-center px-4 md:px-8">
          {/* Logo */}
          <Link href="/" className="mr-6 flex items-center space-x-2 flex-shrink-0" onClick={() => setMobileOpen(false)}>
            <Terminal className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm sm:text-base">JuneXDeployment</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex flex-1 items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/60 hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <Button variant="outline" size="sm" onClick={() => logout()} className="gap-2">
                  <LogOut className="h-3.5 w-3.5" /> Log out
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/login"><LogIn className="h-3.5 w-3.5 mr-1.5" />Log in</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/register"><UserPlus className="h-3.5 w-3.5 mr-1.5" />Sign up</Link>
                  </Button>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute top-16 left-0 right-0 bg-background border-b border-border/40 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="container px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 mt-3 border-t border-border/40">
                {user ? (
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full gap-2">
                        <LogIn className="h-4 w-4" /> Log in
                      </Button>
                    </Link>
                    <Link href="/register" onClick={() => setMobileOpen(false)}>
                      <Button className="w-full gap-2">
                        <UserPlus className="h-4 w-4" /> Sign up
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
'@

Set-Content -Path "$frontendSrc\components\navbar.tsx" -Value $navbar -Encoding UTF8
Write-Host "  navbar.tsx updated with Payments link." -ForegroundColor Green

Write-Host "`nDone! Wallet/Payments page created:" -ForegroundColor Green
Write-Host "  - Summary cards: Total Spent, Bots Unlocked, Pending" -ForegroundColor White
Write-Host "  - Full transaction history with status, method, amount, date" -ForegroundColor White
Write-Host "  - Empty state with Browse Templates CTA" -ForegroundColor White
Write-Host "  - Accessible at /wallet (protected, logged-in users only)" -ForegroundColor White
Write-Host "  - Added to navbar as Payments link" -ForegroundColor White
Write-Host "`nVite will hot-reload automatically." -ForegroundColor Yellow
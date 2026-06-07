# ============================================================
# oauth-step3-frontend.ps1
# Adds Google & GitHub OAuth buttons to login/register pages
# and creates the OAuth callback page
# Run from: C:\Users\user\OneDrive\Desktop\JUNEX\June-Theme-UI
# ============================================================

$frontendSrc = "artifacts\junex\src"

Write-Host "`n[1/4] Creating OAuth callback page..." -ForegroundColor Cyan

$oauthCallback = @'
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function OAuthCallback() {
  const [, navigate] = useLocation();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");

    if (error) {
      navigate("/login?error=" + error);
      return;
    }

    if (token) {
      loginWithToken(token);
    } else {
      navigate("/login");
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm">Signing you in...</p>
      </div>
    </div>
  );
}
'@

Set-Content -Path "$frontendSrc\pages\oauth-callback.tsx" -Value $oauthCallback -Encoding UTF8
Write-Host "  oauth-callback.tsx created." -ForegroundColor Green

# ============================================================
Write-Host "`n[2/4] Creating OAuthButtons component..." -ForegroundColor Cyan

$oauthButtons = @'
import { Button } from "@/components/ui/button";

const API_BASE = "http://localhost:8080";

export function OAuthButtons() {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={() => window.location.href = `${API_BASE}/api/auth/google`}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={() => window.location.href = `${API_BASE}/api/auth/github`}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
        </svg>
        Continue with GitHub
      </Button>
    </div>
  );
}
'@

New-Item -ItemType Directory -Force -Path "$frontendSrc\components" | Out-Null
Set-Content -Path "$frontendSrc\components\oauth-buttons.tsx" -Value $oauthButtons -Encoding UTF8
Write-Host "  oauth-buttons.tsx component created." -ForegroundColor Green

# ============================================================
Write-Host "`n[3/4] Updating login page with OAuth buttons..." -ForegroundColor Cyan

$loginPage = @'
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { OAuthButtons } from "@/components/oauth-buttons";
import { Terminal } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, navigate] = useLocation();
  const { user, login } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    try {
      const result = await loginMutation.mutateAsync({ data: values });
      login(result.user, result.token);
      navigate("/dashboard");
    } catch {
      toast({ title: "Login failed", description: "Invalid credentials", variant: "destructive" });
    }
  }

  return (
    <Layout>
      <div className="container flex min-h-[80vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-[400px]">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Terminal className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl tracking-tight">Sign in</CardTitle>
            <CardDescription>Enter your email below to sign in to your account</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <OAuthButtons />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or with email</span>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" type="email" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="••••••••" type="password" autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary underline-offset-4 hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}
'@

Set-Content -Path "$frontendSrc\pages\login.tsx" -Value $loginPage -Encoding UTF8
Write-Host "  login.tsx updated with OAuth buttons." -ForegroundColor Green

# ============================================================
Write-Host "`n[4/4] Updating App.tsx to add /oauth-callback route and loginWithToken to AuthProvider..." -ForegroundColor Cyan

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
Write-Host "  App.tsx updated with /oauth-callback route." -ForegroundColor Green

Write-Host "`nAll 3 frontend files updated!" -ForegroundColor Green
Write-Host "`nNow check your use-auth.tsx hook — it needs a loginWithToken(token) method." -ForegroundColor Yellow
Write-Host "Run: oauth-step4-auth-hook.ps1" -ForegroundColor Yellow
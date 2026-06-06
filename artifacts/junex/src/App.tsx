import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
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
import { setBaseUrl } from "@workspace/api-client-react";

setBaseUrl("http://localhost:8080");

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/templates" component={Templates} />
      <Route path="/templates/:id" component={TemplateDetail} />
      <Route path="/deployments/:id" component={DeploymentDetail} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/templates/new" component={AdminTemplateNew} />
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

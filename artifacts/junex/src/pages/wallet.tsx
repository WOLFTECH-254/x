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
                  : "â€”"}
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
                        {format(new Date(payment.createdAt), "MMM d, yyyy Â· h:mm a")}
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

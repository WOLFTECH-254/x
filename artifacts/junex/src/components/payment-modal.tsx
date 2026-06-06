import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useInitiatePayment, useStkPush, verifyPayment } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard,
  Smartphone,
  Loader2,
  CheckCircle2,
  Zap,
  Shield,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  badge?: string;
}

const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 500,
    period: "/month",
    features: ["1 bot deployment", "500MB RAM", "Community support", "99% uptime"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 1500,
    period: "/month",
    badge: "Most Popular",
    features: ["5 bot deployments", "1GB RAM per bot", "Priority support", "99.9% uptime", "Custom domain"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 5000,
    period: "/month",
    features: ["Unlimited deployments", "4GB RAM per bot", "24/7 dedicated support", "99.99% uptime", "SLA guarantee"],
  },
];

type PaymentMethod = "card" | "mpesa";
type Step = "plan" | "method" | "mpesa-input" | "mpesa-pending" | "success";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSuccess: () => void;
}

export function PaymentModal({ open, onOpenChange, onPaymentSuccess }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("plan");
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[1]);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [phone, setPhone] = useState("");
  const [pendingReference, setPendingReference] = useState("");

  const initiatePayment = useInitiatePayment({
    mutation: {
      onSuccess: (data) => {
        window.open(data.authorizationUrl, "_blank");
        setPendingReference(data.reference);
        setStep("success");
      },
      onError: () => {
        toast({ title: "Payment failed to initialize", variant: "destructive" });
      },
    },
  });

  const stkPushMutation = useStkPush({
    mutation: {
      onSuccess: (data) => {
        setPendingReference(data.reference);
        setStep("mpesa-pending");
      },
      onError: () => {
        toast({ title: "STK push failed", variant: "destructive" });
      },
    },
  });

  const [isVerifying, setIsVerifying] = useState(false);

  function handleCardPay() {
    if (!user?.email) return;
    initiatePayment.mutate({
      data: {
        email: user.email,
        amount: selectedPlan.price,
        planType: selectedPlan.id,
        currency: "KES",
      },
    });
  }

  function handleStkPush() {
    if (!phone.trim()) {
      toast({ title: "Enter your M-Pesa phone number", variant: "destructive" });
      return;
    }
    stkPushMutation.mutate({
      data: {
        phone: phone.trim(),
        amount: selectedPlan.price,
        email: user?.email ?? "",
        planType: selectedPlan.id,
      },
    });
  }

  async function handleVerify() {
    if (!pendingReference) return;
    setIsVerifying(true);
    try {
      const result = await verifyPayment(pendingReference);
      if (result.status === "success") {
        setStep("success");
        toast({ title: "Payment confirmed!" });
        setTimeout(() => {
          onPaymentSuccess();
          onOpenChange(false);
        }, 1500);
      } else {
        toast({ title: "Payment pending. Check your phone and try again." });
      }
    } catch {
      toast({ title: "Could not verify payment", variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  }

  function reset() {
    setStep("plan");
    setSelectedPlan(PLANS[1]);
    setMethod("card");
    setPhone("");
    setPendingReference("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {step === "plan" && "Choose Your Plan"}
            {step === "method" && "Select Payment Method"}
            {step === "mpesa-input" && "M-Pesa Payment"}
            {step === "mpesa-pending" && "Confirm Payment"}
            {step === "success" && "Payment Initiated"}
          </DialogTitle>
          <DialogDescription>
            {step === "plan" && "Select a hosting plan for your bot deployment."}
            {step === "method" && "How would you like to pay?"}
            {step === "mpesa-input" && "Enter your M-Pesa phone number."}
            {step === "mpesa-pending" && "Check your phone for the STK push prompt."}
            {step === "success" && "Complete payment in the Paystack window."}
          </DialogDescription>
        </DialogHeader>

        {/* ── Plan Selection ── */}
        {step === "plan" && (
          <div className="space-y-3 mt-2">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                data-testid={`plan-${plan.id}`}
                onClick={() => setSelectedPlan(plan)}
                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedPlan.id === plan.id
                    ? "border-primary bg-primary/5"
                    : "border-border/40 hover:border-primary/40"
                }`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-2.5 right-4 text-[10px] bg-primary text-primary-foreground">
                    {plan.badge}
                  </Badge>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{plan.name}</div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {plan.features.slice(0, 2).map((f) => (
                        <span key={f} className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-primary" /> {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <div className="text-xl font-bold">KES {plan.price.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{plan.period}</div>
                  </div>
                </div>
              </div>
            ))}
            <Button
              className="w-full gap-2 mt-2"
              onClick={() => setStep("method")}
              data-testid="button-continue-to-payment"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ── Method Selection ── */}
        {step === "method" && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/40">
              <span className="text-sm text-muted-foreground">Selected plan</span>
              <span className="font-semibold">
                {selectedPlan.name} — KES {selectedPlan.price.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="method-card"
                onClick={() => setMethod("card")}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  method === "card" ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/40"
                }`}
              >
                <div className={`p-3 rounded-xl ${method === "card" ? "bg-primary/20" : "bg-muted"}`}>
                  <CreditCard className={`h-6 w-6 ${method === "card" ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="text-sm font-medium">Card Payment</div>
                <div className="text-xs text-muted-foreground text-center">Visa, Mastercard, etc.</div>
              </button>

              <button
                type="button"
                data-testid="method-mpesa"
                onClick={() => setMethod("mpesa")}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  method === "mpesa" ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/40"
                }`}
              >
                <div className={`p-3 rounded-xl ${method === "mpesa" ? "bg-primary/20" : "bg-muted"}`}>
                  <Smartphone className={`h-6 w-6 ${method === "mpesa" ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="text-sm font-medium">M-Pesa</div>
                <div className="text-xs text-muted-foreground text-center">STK Push to phone</div>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Secured by Paystack — your data is encrypted
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("plan")}>
                Back
              </Button>
              <Button
                className="flex-1 gap-2"
                data-testid="button-pay"
                onClick={() => {
                  if (method === "card") handleCardPay();
                  else setStep("mpesa-input");
                }}
                disabled={initiatePayment.isPending}
              >
                {initiatePayment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Pay Now
              </Button>
            </div>
          </div>
        )}

        {/* ── M-Pesa Input ── */}
        {step === "mpesa-input" && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/40">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="font-semibold">KES {selectedPlan.price.toLocaleString()}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
              <Input
                id="mpesa-phone"
                data-testid="input-mpesa-phone"
                placeholder="254712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Format: 254XXXXXXXXX (Safaricom Kenya only)
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("method")}>
                Back
              </Button>
              <Button
                className="flex-1 gap-2"
                data-testid="button-send-stk"
                onClick={handleStkPush}
                disabled={stkPushMutation.isPending}
              >
                {stkPushMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Smartphone className="h-4 w-4" />
                )}
                {stkPushMutation.isPending ? "Sending..." : "Send STK Push"}
              </Button>
            </div>
          </div>
        )}

        {/* ── M-Pesa Pending ── */}
        {step === "mpesa-pending" && (
          <div className="space-y-4 mt-2 text-center">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Smartphone className="h-8 w-8 text-primary animate-pulse" />
                </div>
              </div>
              <div>
                <p className="font-semibold">Check your phone</p>
                <p className="text-sm text-muted-foreground mt-1">
                  An M-Pesa STK push has been sent to <strong>{phone}</strong>.
                  Enter your PIN to complete payment.
                </p>
              </div>
            </div>

            <Separator />

            <div className="text-xs text-muted-foreground font-mono bg-muted/40 p-2 rounded border border-border/40">
              Ref: {pendingReference}
            </div>

            <Button
              className="w-full gap-2"
              data-testid="button-verify-payment"
              onClick={handleVerify}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              I've Paid — Verify
            </Button>
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={reset}>
              Start over
            </Button>
          </div>
        )}

        {/* ── Success ── */}
        {step === "success" && (
          <div className="space-y-4 mt-2 text-center">
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-lg">Payment Initiated</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete the payment in the Paystack window. Your deployment will activate automatically.
                </p>
              </div>
              {pendingReference && (
                <div className="text-xs text-muted-foreground font-mono bg-muted/40 p-2 rounded border border-border/40 w-full">
                  Ref: {pendingReference}
                </div>
              )}
            </div>
            <Button
              className="w-full"
              onClick={() => {
                onPaymentSuccess();
                onOpenChange(false);
              }}
            >
              Continue to Deploy
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

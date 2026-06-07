import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  CreditCard, Smartphone, Loader2, CheckCircle2, Shield, ArrowRight, Gift,
} from "lucide-react";

const API_BASE = "http://localhost:8080";

type PaymentMethod = "card" | "mpesa";
type Step = "method" | "mpesa-input" | "mpesa-pending" | "success";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSuccess: () => void;
  templateId: number;
  templateName: string;
  price: number;         // in cents/kobo
  currency: string;
  isFree: boolean;
}

function formatPrice(price: number, currency: string): string {
  const amount = price / 100;
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PaymentModal({
  open, onOpenChange, onPaymentSuccess,
  templateId, templateName, price, currency, isFree,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [phone, setPhone] = useState("");
  const [pendingReference, setPendingReference] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const token = localStorage.getItem("junex_token");

  function authHeader() {
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  async function handleCardPay() {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/initiate`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ templateId, currency }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error ?? "Payment failed", variant: "destructive" }); return; }
      window.open(data.authorizationUrl, "_blank");
      setPendingReference(data.reference);
      setStep("success");
    } catch {
      toast({ title: "Could not initiate payment", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStkPush() {
    if (!phone.trim()) { toast({ title: "Enter your M-Pesa phone number", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/stk-push`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ templateId, phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error ?? "STK push failed", variant: "destructive" }); return; }
      setPendingReference(data.reference);
      setStep("mpesa-pending");
    } catch {
      toast({ title: "STK push failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerify() {
    if (!pendingReference) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/verify/${pendingReference}`, {
        headers: authHeader(),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: "Payment confirmed! You can now deploy." });
        setTimeout(() => { onPaymentSuccess(); onOpenChange(false); }, 1200);
      } else {
        toast({ title: "Payment pending", description: "Check your phone and try verifying again." });
      }
    } catch {
      toast({ title: "Could not verify payment", variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  }

  function reset() {
    setStep("method"); setMethod("card"); setPhone(""); setPendingReference(""); setIsLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {step === "method" && "Complete Payment"}
            {step === "mpesa-input" && "M-Pesa Payment"}
            {step === "mpesa-pending" && "Confirm Your Payment"}
            {step === "success" && "Payment Initiated"}
          </DialogTitle>
          <DialogDescription>
            {step === "method" && `Unlock "${templateName}" to deploy`}
            {step === "mpesa-input" && "Enter your M-Pesa number to receive STK push"}
            {step === "mpesa-pending" && "Check your phone and enter M-Pesa PIN"}
            {step === "success" && "Complete payment in the Paystack window, then verify below"}
          </DialogDescription>
        </DialogHeader>

        {/* â”€â”€ Free template shortcut â”€â”€ */}
        {isFree && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Gift className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="font-semibold">This template is free!</p>
            <Button className="w-full" onClick={() => { onPaymentSuccess(); onOpenChange(false); }}>
              Deploy Now
            </Button>
          </div>
        )}

        {/* â”€â”€ Method selection â”€â”€ */}
        {!isFree && step === "method" && (
          <div className="space-y-4 mt-1">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/40">
              <span className="text-sm text-muted-foreground">Amount due</span>
              <span className="font-bold text-lg text-primary">{formatPrice(price, currency)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod("card")}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  method === "card" ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/40"
                }`}
              >
                <div className={`p-3 rounded-xl ${method === "card" ? "bg-primary/20" : "bg-muted"}`}>
                  <CreditCard className={`h-6 w-6 ${method === "card" ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="text-sm font-medium">Card Payment</div>
                <div className="text-xs text-muted-foreground text-center">Visa, Mastercard & more</div>
              </button>

              <button
                type="button"
                onClick={() => setMethod("mpesa")}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  method === "mpesa" ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/40"
                }`}
              >
                <div className={`p-3 rounded-xl ${method === "mpesa" ? "bg-primary/20" : "bg-muted"}`}>
                  <Smartphone className={`h-6 w-6 ${method === "mpesa" ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="text-sm font-medium">M-Pesa</div>
                <div className="text-xs text-muted-foreground text-center">STK Push (Kenya)</div>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Secured by Paystack â€” your data is encrypted
            </div>

            <Button
              className="w-full gap-2"
              onClick={() => { if (method === "card") handleCardPay(); else setStep("mpesa-input"); }}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {isLoading ? "Processing..." : "Pay Now"}
            </Button>
          </div>
        )}

        {/* â”€â”€ M-Pesa input â”€â”€ */}
        {!isFree && step === "mpesa-input" && (
          <div className="space-y-4 mt-1">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/40">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="font-bold text-primary">{formatPrice(price, currency)}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
              <Input
                id="mpesa-phone"
                placeholder="254712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Format: 254XXXXXXXXX (Safaricom Kenya)</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("method")}>Back</Button>
              <Button className="flex-1 gap-2" onClick={handleStkPush} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                {isLoading ? "Sending..." : "Send STK Push"}
              </Button>
            </div>
          </div>
        )}

        {/* â”€â”€ M-Pesa pending â”€â”€ */}
        {!isFree && step === "mpesa-pending" && (
          <div className="space-y-4 mt-1 text-center">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Smartphone className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <p className="font-semibold">Check your phone</p>
              <p className="text-sm text-muted-foreground">
                STK push sent to <strong>{phone}</strong>. Enter your M-Pesa PIN.
              </p>
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground font-mono bg-muted/40 p-2 rounded border border-border/40">
              Ref: {pendingReference}
            </div>
            <Button className="w-full gap-2" onClick={handleVerify} disabled={isVerifying}>
              {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isVerifying ? "Verifying..." : "I've Paid â€” Verify"}
            </Button>
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={reset}>
              Start over
            </Button>
          </div>
        )}

        {/* â”€â”€ Success / card pending â”€â”€ */}
        {!isFree && step === "success" && (
          <div className="space-y-4 mt-1 text-center">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="font-semibold text-lg">Payment Window Opened</p>
              <p className="text-sm text-muted-foreground">
                Complete the payment in the Paystack tab, then click verify below.
              </p>
              {pendingReference && (
                <div className="text-xs font-mono bg-muted/40 p-2 rounded border border-border/40 w-full">
                  Ref: {pendingReference}
                </div>
              )}
            </div>
            <Button className="w-full gap-2" onClick={handleVerify} disabled={isVerifying}>
              {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isVerifying ? "Verifying..." : "Verify Payment"}
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={reset}>Try again</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

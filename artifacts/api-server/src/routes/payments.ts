import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";
const PAYSTACK_BASE = "https://api.paystack.co";

function paystackHeaders() {
  return {
    Authorization: `Bearer ${PAYSTACK_SECRET}`,
    "Content-Type": "application/json",
  };
}

function generateReference() {
  return `JUNEX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

router.post("/payments/initiate", requireAuth, async (req, res): Promise<void> => {
  const { email, amount, planType, currency, callbackUrl } = req.body;
  if (!email || !amount || !planType) {
    res.status(400).json({ error: "email, amount and planType are required" });
    return;
  }
  if (!PAYSTACK_SECRET) {
    res.status(500).json({ error: "Payment provider not configured. Add PAYSTACK_SECRET_KEY." });
    return;
  }

  const reference = generateReference();
  try {
    const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: "POST",
      headers: paystackHeaders(),
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100),
        currency: currency ?? "KES",
        reference,
        callback_url: callbackUrl,
        metadata: { planType },
      }),
    });
    const data = await response.json() as { status: boolean; data?: { authorization_url: string; reference: string; access_code: string }; message?: string };
    if (!data.status || !data.data) {
      res.status(400).json({ error: data.message ?? "Failed to initialize payment" });
      return;
    }
    res.json({
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
      accessCode: data.data.access_code,
    });
  } catch (err) {
    logger.error({ err }, "Paystack initiate error");
    res.status(500).json({ error: "Payment initialization failed" });
  }
});

router.post("/payments/stk-push", requireAuth, async (req, res): Promise<void> => {
  const { phone, amount, email, planType } = req.body;
  if (!phone || !amount || !email) {
    res.status(400).json({ error: "phone, amount and email are required" });
    return;
  }
  if (!PAYSTACK_SECRET) {
    res.status(500).json({ error: "Payment provider not configured. Add PAYSTACK_SECRET_KEY." });
    return;
  }

  const reference = generateReference();
  const normalizedPhone = phone.startsWith("+") ? phone.slice(1) : phone;

  try {
    const response = await fetch(`${PAYSTACK_BASE}/charge`, {
      method: "POST",
      headers: paystackHeaders(),
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100),
        currency: "KES",
        reference,
        mobile_money: {
          phone: normalizedPhone,
          provider: "mpesa",
        },
        metadata: { planType },
      }),
    });
    const data = await response.json() as { status: boolean; data?: { status: string; reference: string }; message?: string };
    if (!data.status) {
      res.status(400).json({ error: data.message ?? "STK push failed" });
      return;
    }
    res.json({
      status: data.data?.status ?? "pending",
      reference: data.data?.reference ?? reference,
      message: "STK push sent. Check your phone and enter your M-Pesa PIN.",
    });
  } catch (err) {
    logger.error({ err }, "Paystack STK push error");
    res.status(500).json({ error: "STK push failed" });
  }
});

router.get("/payments/verify/:reference", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.reference) ? req.params.reference[0] : req.params.reference;
  if (!raw) { res.status(400).json({ error: "Reference is required" }); return; }
  if (!PAYSTACK_SECRET) {
    res.status(500).json({ error: "Payment provider not configured." });
    return;
  }

  try {
    const response = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(raw)}`, {
      headers: paystackHeaders(),
    });
    const data = await response.json() as { status: boolean; data?: { status: string; amount: number; customer: { email: string }; paid_at: string | null; reference: string }; message?: string };
    if (!data.status || !data.data) {
      res.status(400).json({ error: data.message ?? "Verification failed" });
      return;
    }
    res.json({
      status: data.data.status,
      reference: data.data.reference,
      amount: data.data.amount,
      email: data.data.customer.email,
      paidAt: data.data.paid_at ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Paystack verify error");
    res.status(500).json({ error: "Payment verification failed" });
  }
});

export default router;

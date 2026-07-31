import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env";
import { requireAdmin, requireAuth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { ApiError } from "../../utils/apiError";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendPaymentReceiptEmail } from "../../utils/mail";
import { paginate } from "../../utils/pagination";
import { PAYMENT_CATEGORIES, PAYMENT_CURRENCIES, Payment, PaymentCoupon, PaymentProduct } from "./payment.model";

const router = Router();
const categorySchema = z.enum(PAYMENT_CATEGORIES);
const currencySchema = z.enum(PAYMENT_CURRENCIES);
const priceSchema = z.object({ currency: currencySchema, amount: z.number().nonnegative() });
const productBody = z.object({
  category: categorySchema,
  kind: z.enum(["Pricing", "Training", "Store"]).default("Pricing"),
  title: z.string().min(2), description: z.string().optional(), duration: z.string().optional(), startDate: z.coerce.date().optional(),
  prices: z.array(priceSchema).min(1), donationPresets: z.array(z.number().positive()).optional(), recurring: z.boolean().optional(), flutterwavePaymentPlanId: z.string().optional(),
  coverImageUrl: z.string().url().optional(), downloadUrls: z.array(z.string().url()).optional(), quantity: z.number().int().nonnegative().optional(), isActive: z.boolean().optional()
});
const couponBody = z.object({
  code: z.string().min(2), type: z.enum(["Coupon", "Scholarship"]).optional(), discountType: z.enum(["Percentage", "Fixed"]), amount: z.number().positive(), currency: currencySchema.optional(),
  trainingProductId: z.string().regex(/^[a-f\d]{24}$/i).optional(), expiresAt: z.coerce.date().optional(), usageLimit: z.number().int().positive().optional(), isActive: z.boolean().optional()
});
const initializeBody = z.object({
  category: categorySchema, productId: z.string().regex(/^[a-f\d]{24}$/i).optional(), currency: currencySchema,
  amount: z.number().positive().optional(), couponCode: z.string().optional(), donationCause: z.string().max(120).optional(),
  customer: z.object({ fullName: z.string().min(2), email: z.string().email(), phone: z.string().min(3), country: z.string().min(2), state: z.string().optional(), city: z.string().optional(), church: z.string().optional(), clusterPeople: z.number().int().positive().optional(), prayerRequest: z.string().max(2000).optional(), paymentPlan: z.string().optional() })
});

function allowedCurrencies() {
  return env.FLW_ALLOWED_CURRENCIES.split(",").map((value) => value.trim().toUpperCase()).filter((value): value is z.infer<typeof currencySchema> => PAYMENT_CURRENCIES.includes(value as z.infer<typeof currencySchema>));
}

async function flutterwaveFetch(path: string, init?: RequestInit) {
  if (!env.FLW_SECRET_KEY) throw new ApiError(503, "Payments are not configured.", "PAYMENT_NOT_CONFIGURED");
  const response = await fetch(`https://api.flutterwave.com/v3${path}`, { ...init, headers: { Authorization: `Bearer ${env.FLW_SECRET_KEY}`, "Content-Type": "application/json", ...init?.headers } });
  const data = await response.json().catch(() => ({})) as { message?: string; data?: Record<string, unknown> };
  if (!response.ok) throw new ApiError(502, data.message || "Flutterwave request failed.", "PAYMENT_PROVIDER_ERROR");
  return data;
}

async function applyCoupon(code: string | undefined, productId: string | undefined, amount: number, currency: string) {
  if (!code) return { coupon: undefined, discountAmount: 0 };
  const coupon = await PaymentCoupon.findOne({ code: code.trim().toUpperCase(), isActive: true });
  if (!coupon || (coupon.expiresAt && coupon.expiresAt < new Date()) || (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)) throw new ApiError(400, "Coupon is invalid or unavailable.", "INVALID_COUPON");
  if (coupon.trainingProductId && String(coupon.trainingProductId) !== productId) throw new ApiError(400, "Coupon is not valid for this training.", "INVALID_COUPON");
  if (coupon.currency && coupon.currency !== currency) throw new ApiError(400, "Coupon is not valid for this currency.", "INVALID_COUPON");
  const discountAmount = coupon.discountType === "Percentage" ? amount * (coupon.amount / 100) : coupon.amount;
  return { coupon, discountAmount: Math.min(Number(discountAmount.toFixed(2)), amount) };
}

async function fulfillPayment(paymentId: string, providerPayload: Record<string, unknown>) {
  const payment = await Payment.findById(paymentId).populate("productId");
  if (!payment) throw new ApiError(404, "Payment was not found.", "NOT_FOUND");
  if (!payment.customer) throw new ApiError(500, "Payment customer information is missing.", "PAYMENT_DATA_ERROR");
  if (payment.status === "Successful") return payment;
  const product = payment.productId as unknown as { downloadUrls?: string[] } | undefined;
  payment.status = "Successful";
  payment.fulfilledAt = new Date();
  payment.providerPayload = providerPayload;
  await payment.save();
  if (payment.couponId) await PaymentCoupon.findByIdAndUpdate(payment.couponId, { $inc: { usageCount: 1 } });
  const receipt = await sendPaymentReceiptEmail({ email: payment.customer.email, fullName: payment.customer.fullName, purpose: payment.purpose, category: payment.category, amount: payment.expectedAmount, currency: payment.currency, txRef: payment.txRef, ...(product?.downloadUrls ? { downloadUrls: product.downloadUrls } : {}) });
  if (receipt.ok) await Payment.findByIdAndUpdate(payment._id, { receiptSentAt: new Date() });
  return payment;
}

router.get("/catalog", asyncHandler(async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const filter = { isActive: true, ...(category ? { category } : {}) };
  const products = await PaymentProduct.find(filter).sort({ category: 1, createdAt: -1 }).lean();
  sendSuccess(res, "Payment catalog loaded.", { categories: PAYMENT_CATEGORIES, currencies: allowedCurrencies(), products });
}));

router.post("/initialize", validate(z.object({ body: initializeBody })), asyncHandler(async (req, res) => {
  const input = req.body as z.infer<typeof initializeBody>;
  if (!allowedCurrencies().includes(input.currency)) throw new ApiError(400, "Currency is not available.", "INVALID_CURRENCY");
  const product = input.productId ? await PaymentProduct.findOne({ _id: input.productId, isActive: true }) : null;
  if (input.productId && !product) throw new ApiError(404, "Payment item was not found.", "NOT_FOUND");
  if (product && product.category !== input.category) throw new ApiError(400, "Payment item does not match category.", "VALIDATION_ERROR");
  const configuredPrice = product?.prices.find((price) => price.currency === input.currency)?.amount;
  const isDonation = ["Donations", "Offerings", "Tithes", "Partnerships", "Street Business Support", "Mission Projects"].includes(input.category);
  const baseAmount = configuredPrice ?? (isDonation ? input.amount : undefined);
  if (!baseAmount || baseAmount <= 0) throw new ApiError(400, "Select a configured price or enter a valid donation amount.", "INVALID_AMOUNT");
  const { coupon, discountAmount } = await applyCoupon(input.couponCode, input.productId, baseAmount, input.currency);
  const expectedAmount = Number((baseAmount - discountAmount).toFixed(2));
  const txRef = `SC-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const payment = await Payment.create({ category: input.category, purpose: product?.title || input.category, productId: product?._id, userId: req.user?.id, customer: input.customer, donationCause: input.donationCause, currency: input.currency, expectedAmount, discountAmount, couponId: coupon?._id, ...(product?.recurring ? { subscription: { plan: input.customer.paymentPlan || product.title, flutterwavePaymentPlanId: product.flutterwavePaymentPlanId, status: "Active" } } : {}), txRef });
  if (expectedAmount === 0) {
    await fulfillPayment(String(payment._id), { provider: "internal", reason: "full-discount" });
    sendSuccess(res, "Payment completed with discount.", { payment, checkout: null }, 201);
    return;
  }
  const redirectUrl = env.FLW_REDIRECT_URL || `${req.protocol}://${req.get("host")}/payments`;
  const provider = await flutterwaveFetch("/payments", { method: "POST", body: JSON.stringify({ tx_ref: txRef, amount: expectedAmount, currency: input.currency, redirect_url: redirectUrl, customer: { email: input.customer.email, name: input.customer.fullName, phonenumber: input.customer.phone }, meta: { payment_id: String(payment._id), category: input.category, purpose: payment.purpose }, ...(product?.recurring && product.flutterwavePaymentPlanId ? { payment_plan: product.flutterwavePaymentPlanId } : {}), customizations: { title: "Supersite Citizens Kingdom Payments", description: payment.purpose } }) });
  sendSuccess(res, "Flutterwave checkout initialized.", { payment: { id: payment._id, txRef, expectedAmount, currency: input.currency }, paymentLink: provider.data?.link });
}));

router.get("/verify", asyncHandler(async (req, res) => {
  const transactionId = typeof req.query.transaction_id === "string" ? req.query.transaction_id : "";
  const txRef = typeof req.query.tx_ref === "string" ? req.query.tx_ref : "";
  if (!transactionId || !txRef) throw new ApiError(400, "transaction_id and tx_ref are required.", "VALIDATION_ERROR");
  const payment = await Payment.findOne({ txRef });
  if (!payment) throw new ApiError(404, "Payment was not found.", "NOT_FOUND");
  const provider = await flutterwaveFetch(`/transactions/${encodeURIComponent(transactionId)}/verify`);
  const data = provider.data || {};
  if (data.tx_ref !== payment.txRef || data.status !== "successful" || Number(data.amount) !== payment.expectedAmount || data.currency !== payment.currency) {
    await Payment.findByIdAndUpdate(payment._id, { status: "Failed", providerPayload: data });
    throw new ApiError(400, "Payment verification did not match the expected transaction.", "PAYMENT_VERIFICATION_FAILED");
  }
  payment.flutterwaveTransactionId = String(data.id || transactionId);
  if (typeof data.flw_ref === "string") payment.flutterwaveReference = data.flw_ref;
  await payment.save();
  const completed = await fulfillPayment(String(payment._id), data);
  sendSuccess(res, "Payment verified.", { payment: completed });
}));

router.post("/webhook/flutterwave", asyncHandler(async (req, res) => {
  const signature = req.headers["verif-hash"];
  if (!env.FLW_WEBHOOK_SECRET || signature !== env.FLW_WEBHOOK_SECRET) throw new ApiError(401, "Invalid Flutterwave webhook signature.", "UNAUTHORIZED");
  const event = req.body as { data?: { id?: string | number; tx_ref?: string } };
  if (!event.data?.id || !event.data.tx_ref) throw new ApiError(400, "Webhook event does not contain a transaction.", "VALIDATION_ERROR");
  const payment = await Payment.findOne({ txRef: event.data.tx_ref });
  if (!payment) return sendSuccess(res, "Webhook ignored for unknown payment.");
  const provider = await flutterwaveFetch(`/transactions/${encodeURIComponent(String(event.data.id))}/verify`);
  const data = provider.data || {};
  if (data.tx_ref === payment.txRef && data.status === "successful" && Number(data.amount) === payment.expectedAmount && data.currency === payment.currency) {
    payment.flutterwaveTransactionId = String(data.id || event.data.id);
    await payment.save();
    await fulfillPayment(String(payment._id), data);
  }
  sendSuccess(res, "Webhook processed.");
}));

router.use(requireAuth, requireAdmin);
router.get("/admin/payments", asyncHandler(async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : "";
  const category = typeof req.query.category === "string" ? req.query.category : "";
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const filter = { ...(category ? { category } : {}), ...(status ? { status } : {}), ...(search ? { $or: [{ txRef: new RegExp(search, "i") }, { "customer.email": new RegExp(search, "i") }, { "customer.fullName": new RegExp(search, "i") }] } : {}) };
  const { items, meta } = await paginate(Payment, filter, req, ["productId", "couponId", "userId"]);
  sendSuccess(res, "Payments loaded.", { data: items, meta });
}));
router.get("/admin/statistics", asyncHandler(async (_req, res) => {
  const revenue = await Payment.aggregate([{ $match: { status: "Successful" } }, { $group: { _id: { category: "$category", currency: "$currency" }, revenue: { $sum: "$expectedAmount" }, payments: { $sum: 1 } } }, { $sort: { "_id.category": 1 } }]);
  const total = await Payment.countDocuments();
  sendSuccess(res, "Payment statistics loaded.", { total, revenue });
}));
router.get("/admin/export", asyncHandler(async (req, res) => {
  const format = req.query.format === "excel" ? "excel" : "csv";
  const payments = await Payment.find({}).sort({ createdAt: -1 }).lean();
  const rows = [["Reference", "Category", "Purpose", "Customer", "Email", "Amount", "Currency", "Status", "Created"]].concat(payments.map((payment) => [payment.txRef, payment.category, payment.purpose, payment.customer?.fullName || "", payment.customer?.email || "", String(payment.expectedAmount), payment.currency, payment.status, payment.createdAt.toISOString()]));
  const csv = rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")).join("\n");
  res.type(format === "excel" ? "application/vnd.ms-excel" : "text/csv").attachment(`kingdom-payments.${format === "excel" ? "xls" : "csv"}`).send(csv);
}));
router.route("/admin/products").get(asyncHandler(async (_req, res) => sendSuccess(res, "Payment products loaded.", { data: await PaymentProduct.find().sort({ createdAt: -1 }).lean() }))).post(validate(z.object({ body: productBody })), asyncHandler(async (req, res) => sendSuccess(res, "Payment product created.", await PaymentProduct.create(req.body), 201)));
router.patch("/admin/products/:id", validate(z.object({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }), body: productBody.partial() })), asyncHandler(async (req, res) => { const product = await PaymentProduct.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!product) throw new ApiError(404, "Payment product was not found.", "NOT_FOUND"); sendSuccess(res, "Payment product updated.", product); }));
router.route("/admin/coupons").get(asyncHandler(async (_req, res) => sendSuccess(res, "Payment coupons loaded.", { data: await PaymentCoupon.find().sort({ createdAt: -1 }).lean() }))).post(validate(z.object({ body: couponBody })), asyncHandler(async (req, res) => sendSuccess(res, "Payment coupon created.", await PaymentCoupon.create({ ...req.body, code: req.body.code.toUpperCase() }), 201)));
router.patch("/admin/coupons/:id", validate(z.object({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }), body: couponBody.partial() })), asyncHandler(async (req, res) => { const coupon = await PaymentCoupon.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!coupon) throw new ApiError(404, "Payment coupon was not found.", "NOT_FOUND"); sendSuccess(res, "Payment coupon updated.", coupon); }));

export default router;

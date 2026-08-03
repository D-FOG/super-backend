import { model, Schema, type InferSchemaType } from "mongoose";

export const PAYMENT_CATEGORIES = [
  "Mentorship", "Cluster Registration", "School of Purpose Training", "Kingdom Store", "Offerings", "Tithes", "Donations", "Street Business Support", "Mission Projects", "Partnerships"
] as const;

export const DONATION_CAUSES = [
  "Evangelism",
  "Discipleship",
  "Leadership Development",
  "Missions",
  "Children's Ministry",
  "Media Ministry",
  "Community Outreach",
  "General Ministry Support"
] as const;

export const MINISTRY_DONATION_PRESETS = [5000, 10000, 25000, 50000, 100000] as const;

export const PAYMENT_CURRENCIES = ["NGN", "USD", "GBP", "EUR"] as const;
export type PaymentCategory = (typeof PAYMENT_CATEGORIES)[number];
export type PaymentCurrency = (typeof PAYMENT_CURRENCIES)[number];

const paymentProductSchema = new Schema({
  category: { type: String, enum: PAYMENT_CATEGORIES, required: true, index: true },
  kind: { type: String, enum: ["Pricing", "Training", "Store"], default: "Pricing" },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  duration: { type: String, trim: true },
  startDate: { type: Date },
  prices: { type: [{ currency: { type: String, enum: PAYMENT_CURRENCIES, required: true }, amount: { type: Number, min: 0, required: true } }], default: [] },
  donationPresets: { type: [Number], default: [] },
  recurring: { type: Boolean, default: false },
  flutterwavePaymentPlanId: { type: String, trim: true },
  coverImageUrl: { type: String, trim: true },
  downloadUrls: { type: [String], default: [] },
  quantity: { type: Number, min: 0 },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

const couponSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ["Coupon", "Scholarship"], default: "Coupon" },
  discountType: { type: String, enum: ["Percentage", "Fixed"], required: true },
  amount: { type: Number, min: 0, required: true },
  currency: { type: String, enum: PAYMENT_CURRENCIES },
  trainingProductId: { type: Schema.Types.ObjectId, ref: "PaymentProduct" },
  expiresAt: { type: Date },
  usageLimit: { type: Number, min: 1 },
  usageCount: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const paymentSchema = new Schema({
  category: { type: String, enum: PAYMENT_CATEGORIES, required: true, index: true },
  purpose: { type: String, required: true, trim: true },
  productId: { type: Schema.Types.ObjectId, ref: "PaymentProduct" },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  customer: { fullName: { type: String, required: true }, email: { type: String, required: true, lowercase: true }, phone: String, country: String, state: String, city: String, church: String, clusterPeople: Number, prayerRequest: String, paymentPlan: String },
  donationCause: { type: String },
  currency: { type: String, enum: PAYMENT_CURRENCIES, required: true },
  expectedAmount: { type: Number, required: true, min: 0 },
  discountAmount: { type: Number, default: 0, min: 0 },
  couponId: { type: Schema.Types.ObjectId, ref: "PaymentCoupon" },
  subscription: { plan: String, flutterwavePaymentPlanId: String, status: { type: String, enum: ["Active", "Cancelled", "Past Due"] } },
  txRef: { type: String, required: true, unique: true, index: true },
  flutterwaveTransactionId: { type: String, index: true },
  flutterwaveReference: String,
  status: { type: String, enum: ["Initialized", "Pending", "Successful", "Failed", "Cancelled", "Refunded"], default: "Initialized", index: true },
  providerPayload: { type: Schema.Types.Mixed, default: {} },
  fulfilledAt: Date,
  receiptSentAt: Date,
  receiptLastAttemptAt: Date,
  receiptError: { type: String, trim: true }
}, { timestamps: true });

paymentSchema.index({ category: 1, status: 1, createdAt: -1 });

export type PaymentDocument = InferSchemaType<typeof paymentSchema>;
export const PaymentProduct = model("PaymentProduct", paymentProductSchema);
export const PaymentCoupon = model("PaymentCoupon", couponSchema);
export const Payment = model<PaymentDocument>("Payment", paymentSchema);

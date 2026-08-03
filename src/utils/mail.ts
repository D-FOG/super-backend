import { env } from "../config/env";

type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type MailResult = {
  ok: boolean;
  provider: string;
  status?: number;
  error?: string;
};

function responseError(body: string) {
  try {
    const parsed = JSON.parse(body) as { message?: unknown; error?: unknown };
    const message = parsed.message || parsed.error;
    if (typeof message === "string") return message.slice(0, 500);
  } catch {
    // A plain-text provider response is still useful when diagnosing delivery.
  }
  return body.trim().slice(0, 500) || "ZeptoMail did not provide an error message.";
}

export async function sendEmail(payload: MailPayload): Promise<MailResult> {
  const provider = env.MAIL_PROVIDER;

  if (provider === "zeptomail") {
    const endpoint = env.ZEPTO_MAIL_ENDPOINT || "https://api.zeptomail.com/v1.1/email";
    const token = env.ZEPTO_MAIL_TOKEN;
    if (!token) {
      const error = "ZEPTO_MAIL_TOKEN is not configured.";
      console.error("[mail:zeptomail] delivery failed", { to: payload.to, error });
      return { ok: false, provider, error };
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `${env.ZEPTO_MAIL_AUTH_PREFIX || "Zoho-enczapikey"} ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: { address: env.MAIL_FROM || "hello@supersitecitizens.org" },
          to: [{ email_address: { address: payload.to } }],
          subject: payload.subject,
          htmlbody: payload.html,
          textbody: payload.text || payload.html.replace(/<[^>]*>/g, "")
        })
      });
      if (response.ok) return { ok: true, provider, status: response.status };

      const error = responseError(await response.text());
      console.error("[mail:zeptomail] delivery failed", { to: payload.to, status: response.status, error });
      return { ok: false, provider, status: response.status, error };
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : "Unknown network error.";
      console.error("[mail:zeptomail] delivery failed", { to: payload.to, error });
      return { ok: false, provider, error };
    }
  }

  console.info(`[mail:${provider}] ${payload.subject} -> ${payload.to}`);
  return { ok: true, provider, status: 200 };
}

export async function sendLeaderApplicationDecisionEmail(email: string, status: "Approved" | "Rejected", reviewNote?: string) {
  const subject = `Leader application ${status.toLowerCase()}`;
  const message = reviewNote
    ? `Your leader application was ${status}. Review note: ${reviewNote}`
    : `Your leader application was ${status}.`;

  return sendEmail({
    to: email,
    subject,
    html: `<p>${message}</p>`,
    text: message
  });
}

export async function sendLeaderApplicationSubmittedEmail(email: string) {
  const subject = "Leader application pending review";
  const message = "Your leader application was received and is pending review.";

  return sendEmail({
    to: email,
    subject,
    html: `<p>${message}</p>`,
    text: message
  });
}

export async function sendPaymentReceiptEmail(input: {
  email: string;
  fullName: string;
  purpose: string;
  category: string;
  amount: number;
  currency: string;
  txRef: string;
  downloadUrls?: string[];
}) {
  const downloads = input.downloadUrls?.length
    ? `<p>Your digital resources:</p><ul>${input.downloadUrls.map((url) => `<li><a href="${url}">Download resource</a></li>`).join("")}</ul>`
    : "";
  const nextSteps = input.category === "Mentorship"
    ? "A member of our mentorship team will contact you with the next steps."
    : input.category === "Cluster Registration"
      ? "Our leadership team will contact you regarding your onboarding."
      : "Thank you for partnering with what God is doing.";
  const message = `Thank you, ${input.fullName}. Your payment for ${input.purpose} was successful. Transaction: ${input.txRef}. Amount: ${input.currency} ${input.amount.toFixed(2)}. ${nextSteps}`;
  return sendEmail({
    to: input.email,
    subject: `Payment receipt — ${input.purpose}`,
    html: `<p>${message}</p>${downloads}`,
    text: `${message}${input.downloadUrls?.length ? ` Downloads: ${input.downloadUrls.join(", ")}` : ""}`
  });
}

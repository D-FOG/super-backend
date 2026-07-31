type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(payload: MailPayload) {
  const provider = process.env.MAIL_PROVIDER || "placeholder";

  if (provider === "zeptomail") {
    const endpoint = process.env.ZEPTO_MAIL_ENDPOINT || "https://api.zeptomail.com/v1.1/email";
    const token = process.env.ZEPTO_MAIL_TOKEN;
    if (!endpoint || !token) {
      console.warn("ZeptoMail is not configured. Skipping email send.");
      return { ok: false, provider, reason: "missing-config" };
    }

    const fromAddress = process.env.MAIL_FROM || "hello@supersitecitizens.org";
    const authPrefix = process.env.ZEPTO_MAIL_AUTH_PREFIX || "Zoho-enczapikey";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `${authPrefix} ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: {
          address: fromAddress
        },
        to: [{ email_address: { address: payload.to } }],
        subject: payload.subject,
        htmlbody: payload.html,
        textbody: payload.text || payload.html.replace(/<[^>]*>/g, "")
      })
    });

    return { ok: response.ok, provider, status: response.status };
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

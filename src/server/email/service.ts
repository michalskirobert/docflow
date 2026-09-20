type EmailInput = { to: string; subject: string; html: string };
export async function sendEmail(input: EmailInput) {
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  if (provider === "console") {
    console.info("[email:console]", {
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    return;
  }
  if (provider !== "resend")
    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from)
    throw new Error("RESEND_API_KEY and EMAIL_FROM are required for Resend");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });
  if (!response.ok)
    throw new Error(
      `Email provider returned ${response.status}: ${await response.text()}`,
    );
}

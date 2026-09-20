import nodemailer from "nodemailer";

type EmailInput = { to: string; subject: string; html: string };

export async function sendEmail(input: EmailInput) {
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  if (provider === "console") {
    console.info("[email:console]", { to: input.to, subject: input.subject });
    return;
  }
  if (provider !== "smtp")
    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.MAIL_FROM_EMAIL ?? user;
  const fromName = process.env.MAIL_FROM_NAME ?? "DocFlow";

  if (!host || !user || !pass || !fromEmail)
    throw new Error("SMTP configuration is incomplete");

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  await transport.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}

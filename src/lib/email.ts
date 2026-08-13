import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.zoho.com";
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "Verri P Water <noreply@verrip.com.ng>";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string | Buffer }[];
}): Promise<{ success: boolean; error?: string }> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn("[email] SMTP not configured — skipping email send", { to, subject });
    return { success: false, error: "SMTP not configured" };
  }
  try {
    const t = getTransporter();
    await t.sendMail({ from: EMAIL_FROM, to, subject, html, attachments });
    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[email] Send failed:", msg);
    return { success: false, error: msg };
  }
}

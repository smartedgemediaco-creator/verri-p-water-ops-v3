import { sendEmail as sendEmailBase } from "@/lib/email";

interface Designee {
  name: string;
  email: string;
  phone: string;
}

function getDesignees(): Designee[] {
  const designees: Designee[] = [];
  const d1Email = process.env.NOTIFY_DESIGNEE1_EMAIL;
  const d1Phone = process.env.NOTIFY_DESIGNEE1_PHONE;
  const d1Name = process.env.NOTIFY_DESIGNEE1_NAME || "Designee 1";
  if (d1Email || d1Phone) {
    designees.push({ name: d1Name, email: d1Email || "", phone: d1Phone || "" });
  }
  const d2Email = process.env.NOTIFY_DESIGNEE2_EMAIL;
  const d2Phone = process.env.NOTIFY_DESIGNEE2_PHONE;
  const d2Name = process.env.NOTIFY_DESIGNEE2_NAME || "Designee 2";
  if (d2Email || d2Phone) {
    designees.push({ name: d2Name, email: d2Email || "", phone: d2Phone || "" });
  }
  return designees;
}

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId || !phone) return false;
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace(/\D/g, ""),
        type: "text",
        text: { body: message },
      }),
    });
    if (!res.ok) {
      console.error("WhatsApp send failed:", await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("WhatsApp send failed:", e);
    return false;
  }
}

function maintenanceEmailHtml(opts: {
  title: string;
  type: "upcoming" | "overdue";
  dueDate: string;
  priority: string;
  entity: string;
  description: string;
}): string {
  const color = opts.type === "overdue" ? "#DC2626" : "#D97706";
  const badge = opts.type === "overdue" ? "OVERDUE" : "DUE SOON";
  const badgeBg = opts.type === "overdue" ? "#FEE2E2" : "#FEF3C7";
  const appUrl = process.env.APP_URL || "https://verrip.com.ng";
  const link = `${appUrl}/scheduled-operations`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
  body{font-family:'Outfit',Arial,sans-serif;background:#F9FAFB;margin:0;padding:0}
  .container{max-width:480px;margin:0 auto;padding:24px}
  .card{background:#FFF;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
  .badge{display:inline-block;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:700;color:${color};background:${badgeBg}}
  .detail{margin:16px 0;padding:12px 16px;background:#F9FAFB;border-radius:8px}
  .detail p{margin:4px 0;font-size:14px;color:#4B5563}
  .detail strong{color:#1F2937}
  .btn{display:inline-block;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;background:#465FFF;color:#FFF}
  .footer{text-align:center;margin-top:24px;font-size:12px;color:#9CA3AF}
</style></head><body>
<div class="container"><div class="card">
  <div style="text-align:center;margin-bottom:16px"><span class="badge">${badge}</span></div>
  <h2 style="margin:0 0 8px;font-size:18px;color:#1F2937;text-align:center">${opts.title}</h2>
  <div class="detail">
    <p><strong>Due Date:</strong> ${opts.dueDate}</p>
    <p><strong>Priority:</strong> ${opts.priority}</p>
    <p><strong>Type:</strong> ${opts.entity}</p>
    ${opts.description ? `<p><strong>Details:</strong> ${opts.description}</p>` : ""}
  </div>
  <div style="text-align:center;margin:24px 0">
    <a href="${link}" class="btn">View Maintenance Records</a>
  </div>
</div>
<div class="footer">Verri P Water Inc &bull; Maintenance Notification<br>
<a href="mailto:support@verrip.com.ng" style="color:#465FFF">support@verrip.com.ng</a></div>
</div></body></html>`;
}

export async function notifyDesignees(opts: {
  title: string;
  type: "upcoming" | "overdue";
  dueDate: string;
  priority: string;
  entity: string;
  description: string;
}): Promise<{ emailResults: boolean[]; whatsappResults: boolean[] }> {
  const designees = getDesignees();
  if (designees.length === 0) return { emailResults: [], whatsappResults: [] };

  const typeLabel = opts.type === "overdue" ? "OVERDUE Maintenance" : "Upcoming Maintenance";
  const subject = `[Verri P Water] ${typeLabel}: ${opts.title}`;
  const emailHtml = maintenanceEmailHtml(opts);
  const appUrl = process.env.APP_URL || "https://verrip.com.ng";
  const link = `${appUrl}/scheduled-operations`;
  const plainMsg = `${typeLabel}\n\n${opts.title}\nDue: ${opts.dueDate}\nPriority: ${opts.priority}\nType: ${opts.entity}\n${opts.description ? `Details: ${opts.description}\n` : ""}View: ${link}`;

  const emailResults: boolean[] = [];
  const whatsappResults: boolean[] = [];

  for (const d of designees) {
    if (d.email) {
      const result = await sendEmailBase({ to: d.email, subject, html: emailHtml });
      emailResults.push(result.success);
    }
    if (d.phone) {
      const sent = await sendWhatsApp(d.phone, plainMsg);
      whatsappResults.push(sent);
    }
  }

  return { emailResults, whatsappResults };
}

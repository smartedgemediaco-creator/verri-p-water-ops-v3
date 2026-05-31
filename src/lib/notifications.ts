import connectDB from "./db";
import { User } from "./models/User";
import { UserRole } from "./models/UserRole";
import { sendEmail } from "./email";
import { lowStockEmail, transferStatusEmail, wastageAlertEmail, productionAlertEmail } from "./emailTemplates";

async function getAdminEmails(): Promise<string[]> {
  await connectDB();
  const adminRoles = await UserRole.find({ role: "admin", isActive: true }).lean();
  const userIds = adminRoles.map(r => r.userId.toString());
  const users = await User.find({ _id: { $in: userIds }, isActive: true }).lean();
  return users.map(u => u.email).filter(Boolean);
}

export async function notifyLowStock(material: string, current: number, min: number) {
  const emails = await getAdminEmails();
  if (!emails.length) return;
  await Promise.allSettled(
    emails.map(email =>
      sendEmail({
        to: email,
        subject: `⚠ Low Stock: ${material}`,
        html: lowStockEmail({ material, current, min }),
      })
    )
  );
}

export async function notifyTransferStatus(product: string, qty: number, from: string, to: string, status: string) {
  const emails = await getAdminEmails();
  if (!emails.length) return;
  await Promise.allSettled(
    emails.map(email =>
      sendEmail({
        to: email,
        subject: `Transfer ${status}: ${product}`,
        html: transferStatusEmail({ product, qty, from, to, status }),
      })
    )
  );
}

export async function notifyProductionBatch(product: string, qty: number, factory: string) {
  if (qty < 1000) return; // only alert for large batches
  const emails = await getAdminEmails();
  if (!emails.length) return;
  await Promise.allSettled(
    emails.map(email =>
      sendEmail({
        to: email,
        subject: `🏭 Production: ${qty.toLocaleString()} units of ${product}`,
        html: productionAlertEmail({ product, qty, factory }),
      })
    )
  );
}

export async function notifyWastage(product: string, qty: number, location: string, source: string) {
  const emails = await getAdminEmails();
  if (!emails.length) return;
  await Promise.allSettled(
    emails.map(email =>
      sendEmail({
        to: email,
        subject: `⚠ Wastage: ${product}`,
        html: wastageAlertEmail({ product, qty, location, source }),
      })
    )
  );
}

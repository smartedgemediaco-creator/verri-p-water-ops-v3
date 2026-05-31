import connectDB from "./db";
import { Production } from "./models/Production";
import { Sale } from "./models/Sale";
import { Cost } from "./models/Cost";
import { Transfer } from "./models/Transfer";
import { Wastage } from "./models/Wastage";
import { Stock } from "./models/Stock";
import { sendEmail } from "./email";
import { periodicReportEmail } from "./emailTemplates";

interface ReportFilters {
  startDate: Date;
  endDate: Date;
  scopeType?: string;
  scopeId?: string;
}

export async function generateReportData(filters: ReportFilters) {
  await connectDB();

  const query: Record<string, unknown> = {
    date: { $gte: filters.startDate, $lte: filters.endDate },
  };
  if (filters.scopeType && filters.scopeId) {
    query.locationType = filters.scopeType;
    query.locationId = filters.scopeId;
  }

  const scopeQ = filters.scopeType && filters.scopeId ? {
    locationType: filters.scopeType,
    locationId: filters.scopeId,
  } : {};

  const [productions, sales, costs, transfers, wastages, stockItems] = await Promise.all([
    Production.find(filters.scopeType && filters.scopeId ? {
      date: { $gte: filters.startDate, $lte: filters.endDate },
      factoryId: filters.scopeId,
    } : { date: { $gte: filters.startDate, $lte: filters.endDate } }).lean(),
    Sale.find({ ...query }).lean(),
    Cost.find({ ...query }).lean(),
    Transfer.find({
      date: { $gte: filters.startDate, $lte: filters.endDate },
      ...(filters.scopeId ? {
        $or: [{ fromId: filters.scopeId }, { toId: filters.scopeId }],
      } : {}),
    }).lean(),
    Wastage.find({ ...query }).lean(),
    Stock.find({ ...scopeQ }).lean(),
  ]);

  const totalProduced = productions.reduce((s, p) => s + (p.quantity ?? 0), 0);
  const totalSold = sales.reduce((s, p) => s + (p.quantity ?? 0), 0);
  const totalSalesAmount = sales.reduce((s, p) => s + (p.totalAmount ?? 0), 0);
  const totalCosts = costs.reduce((s, p) => s + (p.amount ?? 0), 0);
  const totalWastage = wastages.reduce((s, p) => s + (p.quantity ?? 0), 0);
  const pendingTransfers = transfers.filter(t => t.status === "pending").length;
  const inTransitTransfers = transfers.filter(t => t.status === "in-transit").length;
  const deliveredTransfers = transfers.filter(t => t.status === "delivered").length;
  const totalStock = stockItems.reduce((s, i) => s + (i.quantity ?? 0), 0);
  const profit = totalSalesAmount - totalCosts;

  return {
    totalProduced,
    totalSold,
    totalSalesAmount,
    totalCosts,
    profit,
    totalWastage,
    totalStock,
    pendingTransfers,
    inTransitTransfers,
    deliveredTransfers,
    totalTransfers: transfers.length,
    productionCount: productions.length,
    saleCount: sales.length,
    costCount: costs.length,
    wastageCount: wastages.length,
    stockCount: stockItems.length,
  };
}

export function formatReportHtml(data: Awaited<ReturnType<typeof generateReportData>>, period: string): string {
  const profitColor = data.profit >= 0 ? "#059669" : "#DC2626";
  return `
    <p style="margin-bottom:16px;">Operations summary for <strong>${period}</strong></p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div style="background:#F3F4F6;border-radius:8px;padding:12px;">
        <p style="font-size:11px;color:#6B7280;margin:0 0 4px;">Produced</p>
        <p style="font-size:16px;font-weight:700;color:#1F2937;margin:0;">${data.totalProduced.toLocaleString()}</p>
      </div>
      <div style="background:#F3F4F6;border-radius:8px;padding:12px;">
        <p style="font-size:11px;color:#6B7280;margin:0 0 4px;">Sold</p>
        <p style="font-size:16px;font-weight:700;color:#1F2937;margin:0;">${data.totalSold.toLocaleString()}</p>
      </div>
      <div style="background:#F3F4F6;border-radius:8px;padding:12px;">
        <p style="font-size:11px;color:#6B7280;margin:0 0 4px;">Revenue</p>
        <p style="font-size:16px;font-weight:700;color:#059669;margin:0;">₦${data.totalSalesAmount.toLocaleString()}</p>
      </div>
      <div style="background:#F3F4F6;border-radius:8px;padding:12px;">
        <p style="font-size:11px;color:#6B7280;margin:0 0 4px;">Costs</p>
        <p style="font-size:16px;font-weight:700;color:#DC2626;margin:0;">₦${data.totalCosts.toLocaleString()}</p>
      </div>
      <div style="background:#F3F4F6;border-radius:8px;padding:12px;">
        <p style="font-size:11px;color:#6B7280;margin:0 0 4px;">Profit</p>
        <p style="font-size:16px;font-weight:700;color:${profitColor};margin:0;">₦${data.profit.toLocaleString()}</p>
      </div>
      <div style="background:#F3F4F6;border-radius:8px;padding:12px;">
        <p style="font-size:11px;color:#6B7280;margin:0 0 4px;">Stock</p>
        <p style="font-size:16px;font-weight:700;color:#1F2937;margin:0;">${data.totalStock.toLocaleString()}</p>
      </div>
    </div>
    <div style="margin-top:16px;background:#F3F4F6;border-radius:8px;padding:12px;">
      <p style="font-size:11px;color:#6B7280;margin:0 0 8px;">Transfers</p>
      <p style="font-size:13px;margin:0;color:#1F2937;">${data.deliveredTransfers} delivered · ${data.inTransitTransfers} in transit · ${data.pendingTransfers} pending</p>
    </div>
    ${data.totalWastage > 0 ? `<div style="margin-top:12px;background:#FEF2F2;border-radius:8px;padding:12px;">
      <p style="font-size:11px;color:#6B7280;margin:0 0 4px;">Wastage</p>
      <p style="font-size:16px;font-weight:700;color:#DC2626;margin:0;">${data.totalWastage.toLocaleString()} units (${data.wastageCount} incidents)</p>
    </div>` : ""}
  `;
}

export async function sendPeriodicReport(
  email: string,
  filters: ReportFilters,
  period: string,
) {
  const data = await generateReportData(filters);
  const reportHtml = formatReportHtml(data, period);
  const subject = `${period} Operations Report — Verri P Water`;

  await sendEmail({
    to: email,
    subject,
    html: periodicReportEmail({ name: period, reportHtml }),
  });

  return data;
}

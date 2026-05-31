// ─── Per-tenant branding (swap this object for other clients) ───
const BRANDING = {
  company: "Verri P Water",
  tagline: "100% Pure & Safe Drinking Water",
  address: "Nigeria",
  logoBg: "#0EA5E9",
  primary: "#465FFF",
  primaryHover: "#3641F5",
  accentFrom: "#0EA5E9",
  accentTo: "#465FFF",
  bg: "#F4F6FA",
  cardBg: "#FFFFFF",
  text: "#101828",
  textMuted: "#475467",
  textFooter: "#9CA3AF",
  border: "#E5E7EB",
  supportEmail: "support@verrip.com.ng",
  logoUrl: `${APP_URL()}/images/logo/auth-logo.svg`,
};

function baseHtml(emoji: string, color: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; }
    body { font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: ${BRANDING.bg}; -webkit-font-smoothing: antialiased; }
    .outer { padding: 40px 16px; }
    .container { max-width: 560px; margin: 0 auto; }
    .card { background: ${BRANDING.cardBg}; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    .accent { height: 5px; background: linear-gradient(90deg, ${BRANDING.accentFrom}, ${BRANDING.accentTo}); }
    .hero { text-align: center; padding: 36px 36px 0; }
    .hero img { width: 56px; height: 56px; border-radius: 14px; display: inline-block; }
    .hero h1 { font-size: 20px; font-weight: 700; color: ${BRANDING.text}; margin: 12px 0 2px; letter-spacing: -0.3px; }
    .hero p { font-size: 13px; color: ${BRANDING.textMuted}; margin: 0; }
    .divider { border: 0; border-top: 1px solid ${BRANDING.border}; margin: 20px 36px 28px; }
    .body-wrap { padding: 0 36px 36px; }
    .icon-circle { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; font-size: 22px; }
    h2 { font-size: 22px; font-weight: 700; color: ${BRANDING.text}; line-height: 1.3; margin: 0 0 8px; letter-spacing: -0.3px; }
    p { font-size: 15px; color: ${BRANDING.textMuted}; line-height: 1.7; margin: 0 0 16px; }
    strong { color: ${BRANDING.text}; font-weight: 600; }
    .btn-wrap { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; background: ${BRANDING.primary}; color: #FFFFFF; box-shadow: 0 2px 8px ${BRANDING.primary}40; }
    .hr { border: 0; border-top: 1px solid ${BRANDING.border}; margin: 28px 0; }
    .stat-grid { background: ${BRANDING.bg}; border-radius: 12px; padding: 16px 20px; margin: 16px 0; }
    .stat-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
    .stat-label { color: ${BRANDING.textMuted}; }
    .stat-value { color: ${BRANDING.text}; font-weight: 600; }
    .alert-box { background: #FEF2F2; border-left: 4px solid #EF4444; border-radius: 8px; padding: 14px 16px; margin: 16px 0; }
    .alert-box p { color: #991B1B; font-size: 14px; margin: 0; }
    .foot { text-align: center; padding: 0 16px 32px; }
    .foot p { font-size: 12px; color: ${BRANDING.textFooter}; line-height: 1.8; margin: 0; }
    .foot a { color: ${BRANDING.primary}; text-decoration: none; }
    .foot-divider { border: 0; border-top: 1px solid ${BRANDING.border}; margin: 0 36px 24px; }
    @media only screen and (max-width: 480px) {
      .outer { padding: 16px 8px; }
      .hero { padding: 28px 20px 0; }
      .hero img { width: 48px; height: 48px; }
      .divider { margin: 16px 20px 20px; }
      .body-wrap { padding: 0 20px 28px; }
      h2 { font-size: 19px; }
      .btn { padding: 12px 28px; font-size: 14px; }
      .foot-divider { margin: 0 20px 20px; }
    }
  </style>
</head>
<body>
  <div class="outer">
    <div class="container">
      <div class="card">
        <div class="accent"></div>
        <div class="hero">
          <img src="${BRANDING.logoUrl}" alt="${BRANDING.company}" width="56" height="56">
          <h1>${BRANDING.company}</h1>
          <p>${BRANDING.tagline}</p>
        </div>
        <hr class="divider">
        <div class="body-wrap">
          <div class="icon-circle" style="background:${color}22;">${emoji}</div>
          ${content}
        </div>
      </div>
      <hr class="foot-divider">
      <div class="foot">
        <p>
          ${BRANDING.company} &bull; ${BRANDING.address}<br>
          <a href="mailto:${BRANDING.supportEmail}">${BRANDING.supportEmail}</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function inviteEmail({ name, link }: { name: string; link: string }): string {
  return baseHtml("🔑", BRANDING.primary, `
    <h2>You're invited</h2>
    <p>Hi ${name},</p>
    <p>An admin has created an account for you on the <strong>${BRANDING.company}</strong> operations platform. Click below to set your password and get started.</p>
    <div class="btn-wrap">
      <a href="${link}" class="btn">Set Your Password</a>
    </div>
    <p style="font-size:13px;color:#9CA3AF;text-align:center;">This link expires in 48 hours. If you didn't expect this invitation, you can safely ignore this email.</p>
  `);
}

export function resetPasswordEmail({ name, link }: { name: string; link: string }): string {
  return baseHtml("🔐", BRANDING.primary, `
    <h2>Reset your password</h2>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password for the <strong>${BRANDING.company}</strong> operations platform. Click below to choose a new one.</p>
    <div class="btn-wrap">
      <a href="${link}" class="btn">Reset Password</a>
    </div>
    <p style="font-size:13px;color:#9CA3AF;text-align:center;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
  `);
}

export function welcomeEmail({ name }: { name: string }): string {
  return baseHtml("✅", "#059669", `
    <h2>Welcome aboard</h2>
    <p>Hi ${name},</p>
    <p>Your account is all set. You can now log in and start managing operations — production, stock, sales, transfers, and more.</p>
    <div class="btn-wrap">
      <a href="${APP_URL()}/signin" class="btn">Go to Dashboard</a>
    </div>
  `);
}

export function lowStockEmail({ material, current, min }: { material: string; current: number; min: number }): string {
  return baseHtml("⚠️", "#EF4444", `
    <h2>Low stock alert</h2>
    <div class="alert-box">
      <p><strong>${material}</strong> is running low — <strong>${current.toLocaleString()}</strong> units remaining (minimum ${min.toLocaleString()}).</p>
    </div>
    <p>Reorder soon to avoid production delays.</p>
    <div class="btn-wrap">
      <a href="${APP_URL()}/raw-materials" class="btn">View Materials</a>
    </div>
  `);
}

export function transferStatusEmail({ product, qty, from, to, status }: { product: string; qty: number; from: string; to: string; status: string }): string {
  const label = status === "delivered" ? "Delivered" : status === "in-transit" ? "In Transit" : "Updated";
  return baseHtml("🚛", BRANDING.primary, `
    <h2>Transfer ${label.toLowerCase()}</h2>
    <p>A transfer of <strong>${qty.toLocaleString()} units</strong> of <strong>${product}</strong> is now <strong>${label}</strong>.</p>
    <div class="stat-grid">
      <div class="stat-row"><span class="stat-label">Product</span><span class="stat-value">${product}</span></div>
      <div class="stat-row"><span class="stat-label">Quantity</span><span class="stat-value">${qty.toLocaleString()}</span></div>
      <div class="stat-row"><span class="stat-label">From</span><span class="stat-value">${from}</span></div>
      <div class="stat-row"><span class="stat-label">To</span><span class="stat-value">${to}</span></div>
      <div class="stat-row"><span class="stat-label">Status</span><span class="stat-value" style="color:${status === 'delivered' ? '#059669' : status === 'in-transit' ? '#D97706' : BRANDING.primary}">${label}</span></div>
    </div>
    <div class="btn-wrap">
      <a href="${APP_URL()}/transfers" class="btn">View Transfers</a>
    </div>
  `);
}

export function wastageAlertEmail({ product, qty, location, source }: { product: string; qty: number; location: string; source: string }): string {
  return baseHtml("⚠️", "#EF4444", `
    <h2>Wastage recorded</h2>
    <div class="alert-box">
      <p><strong>${qty.toLocaleString()} units</strong> of <strong>${product}</strong> recorded as wastage at <strong>${location}</strong> (source: ${source}).</p>
    </div>
    <p>Investigate to prevent further losses.</p>
    <div class="btn-wrap">
      <a href="${APP_URL()}/wastage" class="btn">View Wastage</a>
    </div>
  `);
}

export function productionAlertEmail({ product, qty, factory }: { product: string; qty: number; factory: string }): string {
  return baseHtml("🏭", "#0EA5E9", `
    <h2>Large production batch</h2>
    <p><strong>${qty.toLocaleString()} units</strong> of <strong>${product}</strong> produced at <strong>${factory}</strong>.</p>
    <div class="stat-grid">
      <div class="stat-row"><span class="stat-label">Product</span><span class="stat-value">${product}</span></div>
      <div class="stat-row"><span class="stat-label">Quantity</span><span class="stat-value">${qty.toLocaleString()}</span></div>
      <div class="stat-row"><span class="stat-label">Factory</span><span class="stat-value">${factory}</span></div>
    </div>
    <div class="btn-wrap">
      <a href="${APP_URL()}/stock" class="btn">View Stock</a>
    </div>
  `);
}

export function periodicReportEmail({ name, reportHtml }: { name: string; reportHtml: string }): string {
  return baseHtml("📊", BRANDING.primary, `
    <h2>${name} &mdash; operations report</h2>
    ${reportHtml}
    <div class="btn-wrap">
      <a href="${APP_URL()}/reports" class="btn">View Full Report</a>
    </div>
  `);
}

function APP_URL(): string {
  return process.env.APP_URL || "https://app.verripwater.com";
}

type EmailMetric = {
  label: string;
  value: string | number;
};

type BrandedEmailTemplateInput = {
  eyebrow: string;
  title: string;
  intro: string;
  metrics?: EmailMetric[];
  footer?: string;
  brandName?: string;
  accentColor?: string;
};

function renderMetrics(metrics: EmailMetric[] = []) {
  if (metrics.length === 0) {
    return "";
  }

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-collapse:separate;border-spacing:0 12px;">
      <tr>
        ${metrics
          .map(
            (metric) => `
              <td style="padding:16px 18px;background:#f5f1ea;border:1px solid rgba(21,21,21,0.08);border-radius:18px;">
                <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#756d63;">${metric.label}</div>
                <div style="margin-top:8px;font-size:28px;font-weight:700;color:#151515;">${metric.value}</div>
              </td>
            `,
          )
          .join("")}
      </tr>
    </table>
  `;
}

export function buildBrandedEmailTemplate(input: BrandedEmailTemplateInput) {
  const accentColor = input.accentColor || "#d4ad5b";
  const brandName = input.brandName || "Pointer";

  return `
    <!doctype html>
    <html lang="pt-BR">
      <body style="margin:0;background:#f1ede7;font-family:Arial,Helvetica,sans-serif;color:#151515;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f1ede7;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid rgba(21,21,21,0.08);">
                <tr>
                  <td style="padding:28px 28px 22px;background:radial-gradient(circle at 10% 18%, ${accentColor}55, transparent 13%), linear-gradient(155deg,#111111 0%,#191919 52%,#050505 100%);">
                    <img src="cid:pointer-logo" alt="Pointer" width="180" style="display:block;height:auto;border:0;" />
                    <div style="margin-top:20px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.68);">${input.eyebrow}</div>
                    <h1 style="margin:14px 0 0;font-size:32px;line-height:1.15;color:#ffffff;">${input.title}</h1>
                    <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.74);">${brandName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <p style="margin:0;font-size:16px;line-height:1.7;color:#47403b;">${input.intro}</p>
                    ${renderMetrics(input.metrics)}
                    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#7b746b;">
                      ${input.footer ?? "Pointer | Controle de ponto PWA com foco em confiabilidade e operacao mobile-first."}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

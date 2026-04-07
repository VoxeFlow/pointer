import { readFile } from "node:fs/promises";
import path from "node:path";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { buildBrandedEmailTemplate } from "@/lib/email-template";
import { getMailer } from "@/lib/email";
import { auditLogRepository } from "@/repositories/audit-log-repository";
import { reportService } from "@/services/report-service";

export const monthlyReportService = {
  async sendPendingMonthlyReports() {
    const organizations = await db.organization.findMany({
      where: {
        monthlyReportEnabled: true,
        accountantReportEmail: {
          not: null,
        },
      },
    });

    const results: Array<{ organizationId: string; status: "sent" | "skipped"; reason?: string }> = [];

    for (const organization of organizations) {
      const report = await reportService.buildPreviousMonthReport(organization.id);
      const alreadySentForMonth =
        organization.lastMonthlyReportSentAt &&
        organization.lastMonthlyReportSentAt.getUTCFullYear() === Number(report.monthKey.slice(0, 4)) &&
        organization.lastMonthlyReportSentAt.getUTCMonth() + 1 === Number(report.monthKey.slice(5, 7));

      if (alreadySentForMonth) {
        results.push({
          organizationId: organization.id,
          status: "skipped",
          reason: "already-sent",
        });
        continue;
      }

      const mailer = getMailer();
      const logoPath = path.join(process.cwd(), "public/brand/logo-pointer.png");
      const logoBuffer = await readFile(logoPath);

      await mailer.sendMail({
        from: env.POINTER_EMAIL_FROM,
        to: organization.accountantReportEmail ?? undefined,
        subject: `Pointer | Relatorio mensal ${report.periodLabel}`,
        text: [
          `Relatorio mensal do Pointer referente a ${report.periodLabel}.`,
          "",
          `Total de registros: ${report.summary.totalRecords}`,
          `Registros com inconsistencia: ${report.summary.inconsistentRecords}`,
          `Funcionarios com registros: ${report.summary.employeesWithRecords}`,
          "",
          "O CSV consolidado segue em anexo.",
        ].join("\n"),
        html: buildBrandedEmailTemplate({
          eyebrow: `Relatorio mensal ${report.periodLabel}`,
          title: `Consolidado mensal pronto para o contador`,
          intro: `Segue o consolidado do mes anterior da organizacao ${organization.brandDisplayName || organization.name}, com o CSV completo anexado para conferencia e processamento contabil.`,
          metrics: [
            { label: "Registros", value: report.summary.totalRecords },
            { label: "Inconsistencias", value: report.summary.inconsistentRecords },
            { label: "Funcionarios", value: report.summary.employeesWithRecords },
          ],
          brandName: organization.brandDisplayName || organization.name,
          accentColor: organization.brandAccentColor || "#d4ad5b",
          footer: "Este envio foi gerado automaticamente pelo Pointer no ambiente isolado desta organizacao.",
        }),
        attachments: [
          {
            filename: "pointer-logo.png",
            content: logoBuffer,
            cid: "pointer-logo",
          },
          {
            filename: `pointer-relatorio-${report.monthKey}.csv`,
            content: report.csv,
            contentType: "text/csv; charset=utf-8",
          },
        ],
      });

      await db.organization.update({
        where: { id: organization.id },
        data: {
          lastMonthlyReportSentAt: new Date(),
        },
      });

      await auditLogRepository.create({
        organizationId: organization.id,
        action: "monthly_report_sent",
        targetType: "monthly_report",
        metadataJson: {
          monthKey: report.monthKey,
          to: organization.accountantReportEmail ?? "",
          totalRecords: report.summary.totalRecords,
        },
      });

      results.push({
        organizationId: organization.id,
        status: "sent",
      });
    }

    return results;
  },
};

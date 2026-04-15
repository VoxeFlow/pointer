import { MedicalCertificateStatus, PayslipStatus } from "@prisma/client";
import { endOfMonth, isAfter, startOfMonth } from "date-fns";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { calculatePayrollAttendanceSummary, calculateSuggestedAbsenceDeduction, toDateInBrt } from "@/lib/payroll-attendance";
import { moneySum, parsePayrollItems, type PayrollItem } from "@/lib/payroll";
import { auditLogRepository } from "@/repositories/audit-log-repository";

type BatchBody = {
  competenceMonth?: number;
  competenceYear?: number;
  submitMode?: "draft" | "publish";
};

function mergeAbsenceDeduction(items: PayrollItem[], amount: number) {
  const sanitized = items.filter((item) => item.code !== "FALTA_ATRASO");
  if (amount > 0) {
    sanitized.push({
      code: "FALTA_ATRASO",
      label: "Faltas e atrasos",
      amount: amount.toFixed(2),
    });
  }
  return sanitized;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as BatchBody;
    const competenceMonth = Number(body.competenceMonth);
    const competenceYear = Number(body.competenceYear);
    const submitMode = body.submitMode === "publish" ? "publish" : "draft";

    if (!competenceMonth || competenceMonth < 1 || competenceMonth > 12 || !competenceYear || competenceYear < 2024) {
      return NextResponse.json({ error: "Competência inválida." }, { status: 400 });
    }

    const [organization, employees] = await Promise.all([
      db.organization.findUniqueOrThrow({
        where: { id: session.organizationId },
        select: { id: true, defaultDailyWorkloadMin: true },
      }),
      db.user.findMany({
        where: { organizationId: session.organizationId, role: "EMPLOYEE", isActive: true },
        include: {
          schedule: {
            include: { weekdays: true },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    if (employees.length === 0) {
      return NextResponse.json({ error: "Nenhum funcionário ativo para gerar contracheque." }, { status: 400 });
    }

    const monthStart = startOfMonth(toDateInBrt(competenceYear, competenceMonth, 1));
    const monthEnd = endOfMonth(toDateInBrt(competenceYear, competenceMonth, 1));
    const today = new Date();
    const cappedEnd = isAfter(monthEnd, today) ? today : monthEnd;
    const employeeIds = employees.map((employee) => employee.id);

    const [records, certificates] = await Promise.all([
      db.timeRecord.findMany({
        where: {
          organizationId: session.organizationId,
          isDisregarded: false,
          userId: { in: employeeIds },
          serverTimestamp: { gte: monthStart, lte: cappedEnd },
        },
        select: { userId: true, recordType: true, serverTimestamp: true },
        orderBy: { serverTimestamp: "asc" },
      }),
      db.medicalCertificate.findMany({
        where: {
          organizationId: session.organizationId,
          userId: { in: employeeIds },
          status: { in: [MedicalCertificateStatus.ACCEPTED, MedicalCertificateStatus.REVIEWED] },
          startDate: { lte: cappedEnd },
          endDate: { gte: monthStart },
        },
        select: { userId: true, status: true, startDate: true, endDate: true },
      }),
    ]);

    const recordsByUser = new Map<string, Array<{ recordType: "ENTRY" | "BREAK_OUT" | "BREAK_IN" | "EXIT"; serverTimestamp: Date }>>();
    for (const record of records) {
      if (!recordsByUser.has(record.userId)) recordsByUser.set(record.userId, []);
      recordsByUser.get(record.userId)!.push({
        recordType: record.recordType,
        serverTimestamp: record.serverTimestamp,
      });
    }

    const certificatesByUser = new Map<string, Array<{ status: MedicalCertificateStatus; startDate: Date | null; endDate: Date | null }>>();
    for (const certificate of certificates) {
      if (!certificatesByUser.has(certificate.userId)) certificatesByUser.set(certificate.userId, []);
      certificatesByUser.get(certificate.userId)!.push({
        status: certificate.status,
        startDate: certificate.startDate,
        endDate: certificate.endDate,
      });
    }

    const referenceLabel = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(competenceYear, competenceMonth - 1, 1));

    const targetStatus = submitMode === "publish" ? PayslipStatus.PUBLISHED : PayslipStatus.DRAFT;
    const targetPublishedAt = submitMode === "publish" ? new Date() : null;

    let createdOrUpdatedCount = 0;
    const processed: Array<{
      userId: string;
      userName: string;
      suggestedAbsenceDeduction: number;
      netAmount: string;
    }> = [];

    for (const employee of employees) {
      const attendanceSummary = calculatePayrollAttendanceSummary({
        records: recordsByUser.get(employee.id) ?? [],
        certificates: certificatesByUser.get(employee.id) ?? [],
        schedule: employee.schedule
          ? {
              dailyWorkloadMinutes: employee.schedule.dailyWorkloadMinutes,
              lateToleranceMinutes: employee.schedule.lateToleranceMinutes,
              expectedStartTime: employee.schedule.expectedStartTime,
              weekdays: employee.schedule.weekdays,
            }
          : null,
        from: monthStart,
        to: cappedEnd,
        organizationDefaultDailyWorkloadMin: organization.defaultDailyWorkloadMin,
      });

      const grossAmount = employee.payrollBaseSalary?.toString() ?? "0.00";
      const earningsTemplate = parsePayrollItems(employee.payrollEarningsTemplateJson);
      const deductionsTemplate = parsePayrollItems(employee.payrollDeductionsTemplateJson);
      const absenceDeduction = calculateSuggestedAbsenceDeduction({
        salaryBase: Number(grossAmount),
        missingMinutes: attendanceSummary.missingMinutesTotal,
      });
      const deductionsWithAbsence = mergeAbsenceDeduction(deductionsTemplate, absenceDeduction);

      const benefitsAmount = moneySum(earningsTemplate).toFixed(2);
      const discountsAmount = moneySum(deductionsWithAbsence).toFixed(2);
      const netAmount = (Number(grossAmount) + Number(benefitsAmount) - Number(discountsAmount)).toFixed(2);

      await db.payslip.upsert({
        where: {
          organizationId_userId_competenceMonth_competenceYear: {
            organizationId: session.organizationId,
            userId: employee.id,
            competenceMonth,
            competenceYear,
          },
        },
        create: {
          organizationId: session.organizationId,
          userId: employee.id,
          competenceMonth,
          competenceYear,
          referenceLabel,
          grossAmount,
          benefitsAmount,
          discountsAmount,
          netAmount,
          earningsBreakdownJson: earningsTemplate,
          deductionsBreakdownJson: deductionsWithAbsence,
          notes:
            "Gerado em lote com base no perfil financeiro e cálculo automático de faltas/atrasos.",
          status: targetStatus,
          publishedAt: targetPublishedAt,
        },
        update: {
          grossAmount,
          benefitsAmount,
          discountsAmount,
          netAmount,
          earningsBreakdownJson: earningsTemplate,
          deductionsBreakdownJson: deductionsWithAbsence,
          notes:
            "Gerado em lote com base no perfil financeiro e cálculo automático de faltas/atrasos.",
          status: targetStatus,
          publishedAt: targetPublishedAt,
        },
      });

      createdOrUpdatedCount += 1;
      processed.push({
        userId: employee.id,
        userName: employee.name,
        suggestedAbsenceDeduction: absenceDeduction,
        netAmount,
      });
    }

    await auditLogRepository.create({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      action: submitMode === "publish" ? "payslip_batch_published" : "payslip_batch_generated",
      targetType: "payslip_batch",
      targetId: `${session.organizationId}:${competenceYear}-${competenceMonth}`,
      metadataJson: {
        competenceMonth,
        competenceYear,
        totalEmployees: employees.length,
        createdOrUpdatedCount,
        submitMode,
      },
    });

    return NextResponse.json({
      success: true,
      submitMode,
      competenceMonth,
      competenceYear,
      createdOrUpdatedCount,
      processed,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível gerar contracheques em lote." },
      { status: 400 },
    );
  }
}


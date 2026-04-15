import { MedicalCertificateStatus } from "@prisma/client";
import { endOfMonth, isAfter, startOfMonth } from "date-fns";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { calculatePayrollAttendanceSummary, calculateSuggestedAbsenceDeduction, toDateInBrt } from "@/lib/payroll-attendance";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim() ?? "";
    const competenceMonth = Number(searchParams.get("competenceMonth"));
    const competenceYear = Number(searchParams.get("competenceYear"));

    if (!userId) {
      return NextResponse.json({ error: "Selecione o funcionário." }, { status: 400 });
    }
    if (!competenceMonth || competenceMonth < 1 || competenceMonth > 12 || !competenceYear || competenceYear < 2024) {
      return NextResponse.json({ error: "Competência inválida." }, { status: 400 });
    }

    const [employee, organization] = await Promise.all([
      db.user.findFirst({
        where: { id: userId, organizationId: session.organizationId, role: "EMPLOYEE" },
        include: {
          schedule: {
            include: { weekdays: true },
          },
        },
      }),
      db.organization.findUniqueOrThrow({
        where: { id: session.organizationId },
        select: { defaultDailyWorkloadMin: true },
      }),
    ]);

    if (!employee) {
      return NextResponse.json({ error: "Funcionário não encontrado." }, { status: 404 });
    }

    const monthStart = startOfMonth(toDateInBrt(competenceYear, competenceMonth, 1));
    const monthEnd = endOfMonth(toDateInBrt(competenceYear, competenceMonth, 1));
    const today = new Date();
    const cappedEnd = isAfter(monthEnd, today) ? today : monthEnd;

    const [records, certificates] = await Promise.all([
      db.timeRecord.findMany({
        where: {
          organizationId: session.organizationId,
          userId,
          isDisregarded: false,
          serverTimestamp: { gte: monthStart, lte: cappedEnd },
        },
        select: { recordType: true, serverTimestamp: true },
        orderBy: { serverTimestamp: "asc" },
      }),
      db.medicalCertificate.findMany({
        where: {
          organizationId: session.organizationId,
          userId,
          status: { in: [MedicalCertificateStatus.ACCEPTED, MedicalCertificateStatus.REVIEWED] },
          startDate: { lte: cappedEnd },
          endDate: { gte: monthStart },
        },
        select: { startDate: true, endDate: true, status: true },
      }),
    ]);

    const summary = calculatePayrollAttendanceSummary({
      records,
      certificates,
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

    const salaryBase = Number(employee.payrollBaseSalary?.toString() ?? 0);
    const hourlyRate = salaryBase > 0 ? salaryBase / 220 : 0;
    const suggestedAbsenceDeduction = calculateSuggestedAbsenceDeduction({
      salaryBase,
      missingMinutes: summary.missingMinutesTotal,
    });

    return NextResponse.json({
      success: true,
      summary: {
        userId: employee.id,
        employeeName: employee.name,
        competenceMonth,
        competenceYear,
        ...summary,
      },
      financial: {
        salaryBase,
        hourlyRate,
        suggestedAbsenceDeduction,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível calcular faltas e atrasos." },
      { status: 400 },
    );
  }
}

import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { moneySum, parseMoneyInput, parsePayrollItems, parseRubricValue, type PayrollItem } from "@/lib/payroll";
import { uploadDocument } from "@/lib/storage";
import { auditLogRepository } from "@/repositories/audit-log-repository";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const formData = await request.formData();
    const userId = formData.get("userId")?.toString() || "";
    const competenceMonth = Number(formData.get("competenceMonth"));
    const competenceYear = Number(formData.get("competenceYear"));
    const notes = formData.get("notes")?.toString().trim() || "";
    const submitMode = formData.get("submitMode")?.toString() === "draft" ? "draft" : "publish";
    let grossAmount = parseMoneyInput(formData.get("grossAmount")?.toString() ?? null);
    let benefitsAmount = parseMoneyInput(formData.get("benefitsAmount")?.toString() ?? null);
    let discountsAmount = parseMoneyInput(formData.get("discountsAmount")?.toString() ?? null);
    let netAmount = parseMoneyInput(formData.get("netAmount")?.toString() ?? null);
    const usePayrollProfile = formData.get("usePayrollProfile")?.toString() === "on";
    const file = formData.get("file");

    if (!userId) {
      return NextResponse.json({ error: "Selecione o funcionário." }, { status: 400 });
    }

    if (!competenceMonth || competenceMonth < 1 || competenceMonth > 12 || !competenceYear) {
      return NextResponse.json({ error: "Informe a competência corretamente." }, { status: 400 });
    }

    const employee = await db.user.findFirst({
      where: {
        id: userId,
        organizationId: session.organizationId,
        role: "EMPLOYEE",
      },
      select: {
        id: true,
        payrollBaseSalary: true,
        payrollBenefitsAmount: true,
        payrollDiscountsAmount: true,
        payrollEarningsTemplateJson: true,
        payrollDeductionsTemplateJson: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Funcionário não encontrado." }, { status: 404 });
    }

    const requestedEarnings: PayrollItem[] = [];
    const otherEarningsRubric = parseRubricValue(
      formData.get("otherEarningsRubric")?.toString(),
      "OUTROS_PROVENTOS",
      "Outros proventos",
    );
    const hazardAllowance = parseMoneyInput(formData.get("hazardAllowanceAmount")?.toString() ?? null);
    const familySalary = parseMoneyInput(formData.get("familySalaryAmount")?.toString() ?? null);
    const otherEarnings = parseMoneyInput(formData.get("otherEarningsAmount")?.toString() ?? null);
    if (hazardAllowance && Number(hazardAllowance) > 0) {
      requestedEarnings.push({ code: "ADICIONAL_INSALUBRIDADE", label: "Adicional de insalubridade", amount: hazardAllowance });
    }
    if (familySalary && Number(familySalary) > 0) {
      requestedEarnings.push({ code: "SALARIO_FAMILIA", label: "Salário-família", amount: familySalary });
    }
    if (otherEarnings && Number(otherEarnings) > 0) {
      requestedEarnings.push({ code: otherEarningsRubric.code, label: otherEarningsRubric.label, amount: otherEarnings });
    }

    const requestedDeductions: PayrollItem[] = [];
    const otherDeductionsRubric = parseRubricValue(
      formData.get("otherDeductionsRubric")?.toString(),
      "OUTROS_DESCONTOS",
      "Outros descontos",
    );
    const inss = parseMoneyInput(formData.get("inssAmount")?.toString() ?? null);
    const transportVoucher = parseMoneyInput(formData.get("transportVoucherAmount")?.toString() ?? null);
    const irrf = parseMoneyInput(formData.get("irrfAmount")?.toString() ?? null);
    const otherDeductions = parseMoneyInput(formData.get("otherDeductionsAmount")?.toString() ?? null);
    if (inss && Number(inss) > 0) {
      requestedDeductions.push({ code: "INSS", label: "INSS", amount: inss });
    }
    if (transportVoucher && Number(transportVoucher) > 0) {
      requestedDeductions.push({ code: "VALE_TRANSPORTE", label: "Vale-transporte", amount: transportVoucher });
    }
    if (irrf && Number(irrf) > 0) {
      requestedDeductions.push({ code: "IRRF", label: "IRRF", amount: irrf });
    }
    if (otherDeductions && Number(otherDeductions) > 0) {
      requestedDeductions.push({ code: otherDeductionsRubric.code, label: otherDeductionsRubric.label, amount: otherDeductions });
    }

    let earningsBreakdown = requestedEarnings;
    let deductionsBreakdown = requestedDeductions;

    if (usePayrollProfile) {
      grossAmount = grossAmount ?? employee.payrollBaseSalary?.toString() ?? null;
      if (earningsBreakdown.length === 0) {
        earningsBreakdown = parsePayrollItems(employee.payrollEarningsTemplateJson);
      }
      if (deductionsBreakdown.length === 0) {
        deductionsBreakdown = parsePayrollItems(employee.payrollDeductionsTemplateJson);
      }
      benefitsAmount =
        benefitsAmount ??
        (earningsBreakdown.length > 0 ? moneySum(earningsBreakdown).toFixed(2) : employee.payrollBenefitsAmount?.toString() ?? null);
      discountsAmount =
        discountsAmount ??
        (deductionsBreakdown.length > 0 ? moneySum(deductionsBreakdown).toFixed(2) : employee.payrollDiscountsAmount?.toString() ?? null);
    } else {
      if (!benefitsAmount && earningsBreakdown.length > 0) {
        benefitsAmount = moneySum(earningsBreakdown).toFixed(2);
      }
      if (!discountsAmount && deductionsBreakdown.length > 0) {
        discountsAmount = moneySum(deductionsBreakdown).toFixed(2);
      }
    }

    if (!netAmount) {
      const gross = grossAmount ? Number(grossAmount) : 0;
      const benefits = benefitsAmount ? Number(benefitsAmount) : 0;
      const discounts = discountsAmount ? Number(discountsAmount) : 0;
      netAmount = (gross + benefits - discounts).toFixed(2);
    }

    let upload:
      | {
          url: string;
          originalFileName: string;
          mimeType: string;
          sizeBytes: number;
        }
      | undefined;

    if (file instanceof File && file.size > 0) {
      const uploaded = await uploadDocument(
        file,
        `payslip-${session.organizationId}-${userId}-${competenceYear}-${competenceMonth}-${randomUUID()}-${file.name}`,
      );

      upload = {
        url: uploaded.url,
        originalFileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      };
    }

    const referenceLabel = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(competenceYear, competenceMonth - 1, 1));

    const nextStatus = submitMode === "draft" ? "DRAFT" : "PUBLISHED";
    const nextPublishedAt = submitMode === "publish" ? new Date() : null;

    const payslip = await db.payslip.upsert({
      where: {
        organizationId_userId_competenceMonth_competenceYear: {
          organizationId: session.organizationId,
          userId,
          competenceMonth,
          competenceYear,
        },
      },
      create: {
        organizationId: session.organizationId,
        userId,
        competenceMonth,
        competenceYear,
        referenceLabel,
        fileUrl: upload?.url ?? null,
        originalFileName: upload?.originalFileName ?? null,
        mimeType: upload?.mimeType ?? null,
        sizeBytes: upload?.sizeBytes ?? null,
        grossAmount,
        benefitsAmount,
        discountsAmount,
        netAmount,
        earningsBreakdownJson: earningsBreakdown,
        deductionsBreakdownJson: deductionsBreakdown,
        notes: notes || null,
        status: nextStatus,
        publishedAt: nextPublishedAt,
      },
      update: {
        fileUrl: upload?.url,
        originalFileName: upload?.originalFileName,
        mimeType: upload?.mimeType,
        sizeBytes: upload?.sizeBytes,
        grossAmount,
        benefitsAmount,
        discountsAmount,
        netAmount,
        earningsBreakdownJson: earningsBreakdown,
        deductionsBreakdownJson: deductionsBreakdown,
        notes: notes || null,
        status: nextStatus,
        publishedAt: nextPublishedAt,
      },
    });

    try {
      await auditLogRepository.create({
        organizationId: session.organizationId,
        actorUserId: session.sub,
        action: submitMode === "draft" ? "payslip_draft_saved" : "payslip_published",
        targetType: "payslip",
        targetId: payslip.id,
        metadataJson: {
          userId,
          competenceMonth,
          competenceYear,
          hasFile: Boolean(upload),
          usePayrollProfile,
          earningsItemsCount: earningsBreakdown.length,
          deductionsItemsCount: deductionsBreakdown.length,
        },
      });
    } catch (auditError) {
      console.error("audit_log_failed:payslip", auditError);
    }

    return NextResponse.json({ success: true, id: payslip.id, status: payslip.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel publicar o contracheque." },
      { status: 400 },
    );
  }
}

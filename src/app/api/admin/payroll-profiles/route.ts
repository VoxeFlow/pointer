import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { parseMoneyInput, parseRubricValue } from "@/lib/payroll";
import { auditLogRepository } from "@/repositories/audit-log-repository";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const body = (await request.json()) as {
      userId?: string;
      position?: string;
      baseSalary?: string;
      benefitsAmount?: string;
      discountsAmount?: string;
      hazardAllowanceAmount?: string;
      familySalaryAmount?: string;
      otherEarningsAmount?: string;
      otherEarningsRubric?: string;
      inssAmount?: string;
      transportVoucherAmount?: string;
      irrfAmount?: string;
      otherDeductionsAmount?: string;
      otherDeductionsRubric?: string;
    };

    const userId = body.userId?.trim() ?? "";
    if (!userId) {
      return NextResponse.json({ error: "Selecione o funcionário." }, { status: 400 });
    }

    const employee = await db.user.findFirst({
      where: {
        id: userId,
        organizationId: session.organizationId,
        role: "EMPLOYEE",
      },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Funcionário não encontrado." }, { status: 404 });
    }

    const hazardAllowance = parseMoneyInput(body.hazardAllowanceAmount ?? null);
    const familySalary = parseMoneyInput(body.familySalaryAmount ?? null);
    const otherEarnings = parseMoneyInput(body.otherEarningsAmount ?? null);
    const inss = parseMoneyInput(body.inssAmount ?? null);
    const transportVoucher = parseMoneyInput(body.transportVoucherAmount ?? null);
    const irrf = parseMoneyInput(body.irrfAmount ?? null);
    const otherDeductions = parseMoneyInput(body.otherDeductionsAmount ?? null);

    const otherEarningsRubric = parseRubricValue(body.otherEarningsRubric, "OUTROS_PROVENTOS", "Outros proventos");
    const otherDeductionsRubric = parseRubricValue(body.otherDeductionsRubric, "OUTROS_DESCONTOS", "Outros descontos");

    const earningsTemplate = [
      hazardAllowance ? { code: "ADICIONAL_INSALUBRIDADE", label: "Adicional de insalubridade", amount: hazardAllowance } : null,
      familySalary ? { code: "SALARIO_FAMILIA", label: "Salário-família", amount: familySalary } : null,
      otherEarnings ? { code: otherEarningsRubric.code, label: otherEarningsRubric.label, amount: otherEarnings } : null,
    ].filter(Boolean);

    const deductionsTemplate = [
      inss ? { code: "INSS", label: "INSS", amount: inss } : null,
      transportVoucher ? { code: "VALE_TRANSPORTE", label: "Vale-transporte", amount: transportVoucher } : null,
      irrf ? { code: "IRRF", label: "IRRF", amount: irrf } : null,
      otherDeductions ? { code: otherDeductionsRubric.code, label: otherDeductionsRubric.label, amount: otherDeductions } : null,
    ].filter(Boolean);

    const templateBenefitsAmount = earningsTemplate.reduce((sum, item) => sum + Number((item as { amount: string }).amount), 0);
    const templateDiscountsAmount = deductionsTemplate.reduce((sum, item) => sum + Number((item as { amount: string }).amount), 0);

    const updated = await db.user.update({
      where: { id: employee.id },
      data: {
        payrollProfilePosition: body.position?.trim() || null,
        payrollBaseSalary: parseMoneyInput(body.baseSalary ?? null),
        payrollBenefitsAmount: parseMoneyInput(body.benefitsAmount ?? null) ?? templateBenefitsAmount.toFixed(2),
        payrollDiscountsAmount: parseMoneyInput(body.discountsAmount ?? null) ?? templateDiscountsAmount.toFixed(2),
        payrollEarningsTemplateJson: earningsTemplate,
        payrollDeductionsTemplateJson: deductionsTemplate,
      },
      select: {
        id: true,
        payrollProfilePosition: true,
        payrollBaseSalary: true,
        payrollBenefitsAmount: true,
        payrollDiscountsAmount: true,
        payrollEarningsTemplateJson: true,
        payrollDeductionsTemplateJson: true,
      },
    });

    await auditLogRepository.create({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      action: "payroll_profile_updated",
      targetType: "user",
      targetId: updated.id,
      metadataJson: {
        payrollProfilePosition: updated.payrollProfilePosition,
        payrollBaseSalary: updated.payrollBaseSalary?.toString() ?? null,
        payrollBenefitsAmount: updated.payrollBenefitsAmount?.toString() ?? null,
        payrollDiscountsAmount: updated.payrollDiscountsAmount?.toString() ?? null,
        payrollEarningsTemplateJson: updated.payrollEarningsTemplateJson,
        payrollDeductionsTemplateJson: updated.payrollDeductionsTemplateJson,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel salvar o perfil financeiro." },
      { status: 400 },
    );
  }
}

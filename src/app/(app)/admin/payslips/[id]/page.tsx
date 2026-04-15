import Link from "next/link";
import { notFound } from "next/navigation";

import { PayslipEditForm, getItemAmountByCode } from "@/components/admin/payslip-edit-form";
import { requireRoles } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { parsePayrollItems } from "@/lib/payroll";

function formatMoney(value?: string | null) {
  if (!value) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export default async function AdminPayslipPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRoles(["ADMIN", "ACCOUNTANT"]);
  const { id } = await params;

  const payslip = await db.payslip.findFirst({
    where: {
      id,
      organizationId: session.organizationId,
    },
    include: {
      organization: {
        select: {
          legalName: true,
          name: true,
          documentNumber: true,
        },
      },
      user: {
        select: {
          name: true,
          employeeCode: true,
          payrollProfilePosition: true,
          payrollBaseSalary: true,
          payrollBenefitsAmount: true,
          payrollDiscountsAmount: true,
          payrollEarningsTemplateJson: true,
          payrollDeductionsTemplateJson: true,
        },
      },
    },
  });

  if (!payslip) {
    notFound();
  }

  const gross = Number(payslip.grossAmount?.toString() ?? payslip.user.payrollBaseSalary?.toString() ?? "0");
  const benefits = Number(payslip.benefitsAmount?.toString() ?? payslip.user.payrollBenefitsAmount?.toString() ?? "0");
  const discounts = Number(payslip.discountsAmount?.toString() ?? payslip.user.payrollDiscountsAmount?.toString() ?? "0");
  const net = Number(payslip.netAmount?.toString() ?? (gross + benefits - discounts).toFixed(2));
  
  const earningsBreakdown = parsePayrollItems(
    payslip.earningsBreakdownJson || payslip.user.payrollEarningsTemplateJson
  );
  const deductionsBreakdown = parsePayrollItems(
    payslip.deductionsBreakdownJson || payslip.user.payrollDeductionsTemplateJson
  );
  
  const hazardAllowanceAmount = getItemAmountByCode(earningsBreakdown, "ADICIONAL_INSALUBRIDADE");
  const familySalaryAmount = getItemAmountByCode(earningsBreakdown, "SALARIO_FAMILIA");
  const firstOtherEarnings = earningsBreakdown.find(
    (item) => item.code !== "ADICIONAL_INSALUBRIDADE" && item.code !== "SALARIO_FAMILIA",
  );
  const inssAmount = getItemAmountByCode(deductionsBreakdown, "INSS");
  const transportVoucherAmount = getItemAmountByCode(deductionsBreakdown, "VALE_TRANSPORTE");
  const irrfAmount = getItemAmountByCode(deductionsBreakdown, "IRRF");
  const firstOtherDeductions = deductionsBreakdown.find(
    (item) => item.code !== "INSS" && item.code !== "VALE_TRANSPORTE" && item.code !== "IRRF",
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5">
      <section className="glass rounded-[2rem] p-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Pré-visualização do contracheque</h1>
            <p className="mt-2 text-sm text-muted">
              {payslip.status === "PUBLISHED" ? "Já publicado" : "Rascunho"} • Competência{" "}
              {String(payslip.competenceMonth).padStart(2, "0")}/{payslip.competenceYear}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/accounting?section=contracheques-publicados"
              className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Voltar para lista
            </Link>
            {payslip.fileUrl ? (
              <Link
                href={payslip.fileUrl}
                target="_blank"
                className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold"
              >
                Abrir arquivo anexado
              </Link>
            ) : null}
          </div>
        </div>
      </section>
      <section className="glass rounded-[2rem] p-5">
        <h2 className="text-lg font-semibold">Editar contracheque</h2>
        <p className="mt-2 text-sm text-muted">
          Ajuste valores, recalcule faltas/atrasos e salve rascunho ou publique para o funcionário.
        </p>
        <PayslipEditForm
          userId={payslip.userId}
          employeeName={payslip.user.name}
          competenceMonth={payslip.competenceMonth}
          competenceYear={payslip.competenceYear}
          initialStatus={payslip.status}
          initialGrossAmount={payslip.grossAmount?.toString() ?? payslip.user.payrollBaseSalary?.toString() ?? ""}
          initialBenefitsAmount={payslip.benefitsAmount?.toString() ?? payslip.user.payrollBenefitsAmount?.toString() ?? ""}
          initialDiscountsAmount={payslip.discountsAmount?.toString() ?? payslip.user.payrollDiscountsAmount?.toString() ?? ""}
          initialNetAmount={payslip.netAmount?.toString() ?? ""}
          initialHazardAllowanceAmount={hazardAllowanceAmount}
          initialFamilySalaryAmount={familySalaryAmount}
          initialOtherEarningsAmount={firstOtherEarnings?.amount ?? ""}
          initialOtherEarningsRubric={
            firstOtherEarnings
              ? `${firstOtherEarnings.code}|${firstOtherEarnings.label}`
              : "OUTROS_PROVENTOS|Outros proventos"
          }
          initialInssAmount={inssAmount}
          initialTransportVoucherAmount={transportVoucherAmount}
          initialIrrfAmount={irrfAmount}
          initialOtherDeductionsAmount={firstOtherDeductions?.amount ?? ""}
          initialOtherDeductionsRubric={
            firstOtherDeductions
              ? `${firstOtherDeductions.code}|${firstOtherDeductions.label}`
              : "OUTROS_DESCONTOS|Outros descontos"
          }
          initialNotes={payslip.notes ?? ""}
        />
      </section>
    </div>
  );
}

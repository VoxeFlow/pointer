import Link from "next/link";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { parsePayrollItems } from "@/lib/payroll";
import { PrintPayslipButton } from "@/components/employee/print-payslip-button";

function formatMoney(value?: string | null) {
  if (!value) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export default async function EmployeePayslipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("EMPLOYEE");
  const { id } = await params;

  const payslip = await db.payslip.findFirst({
    where: {
      id,
      organizationId: session.organizationId,
      userId: session.sub,
      status: "PUBLISHED",
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
        },
      },
    },
  });

  if (!payslip) {
    notFound();
  }

  const gross = Number(payslip.grossAmount?.toString() ?? "0");
  const benefits = Number(payslip.benefitsAmount?.toString() ?? "0");
  const discounts = Number(payslip.discountsAmount?.toString() ?? "0");
  const net = Number(payslip.netAmount?.toString() ?? (gross + benefits - discounts).toFixed(2));
  const earningsBreakdown = parsePayrollItems(payslip.earningsBreakdownJson);
  const deductionsBreakdown = parsePayrollItems(payslip.deductionsBreakdownJson);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5">
      <section className="glass rounded-[2rem] p-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Contracheque</h1>
            <p className="mt-2 text-sm text-muted">
              Competência {String(payslip.competenceMonth).padStart(2, "0")}/{payslip.competenceYear}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrintPayslipButton />
            {payslip.fileUrl ? (
              <Link href={payslip.fileUrl} target="_blank" className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold">
                Abrir arquivo enviado
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-white p-6 text-slate-900 shadow-sm print:shadow-none">
        <header className="border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pointer</p>
          <h2 className="mt-1 text-2xl font-bold">Recibo de salário</h2>
          <p className="mt-2 text-sm text-slate-600">
            {payslip.organization.legalName || payslip.organization.name}
            {payslip.organization.documentNumber ? ` • CNPJ ${payslip.organization.documentNumber}` : ""}
          </p>
        </header>

        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <p><strong>Funcionário:</strong> {payslip.user.name}</p>
          <p><strong>Código:</strong> {payslip.user.employeeCode || "—"}</p>
          <p><strong>Cargo:</strong> {payslip.user.payrollProfilePosition || "—"}</p>
          <p><strong>Competência:</strong> {String(payslip.competenceMonth).padStart(2, "0")}/{payslip.competenceYear}</p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <article className="rounded-[1rem] border border-border p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Proventos</h3>
            <div className="mt-3 grid gap-2 text-sm">
              <p className="flex items-center justify-between"><span>Salário base</span><strong>{formatMoney(payslip.grossAmount?.toString())}</strong></p>
              {earningsBreakdown.map((item) => (
                <p key={item.code} className="flex items-center justify-between">
                  <span>{item.label}</span>
                  <strong>{formatMoney(item.amount)}</strong>
                </p>
              ))}
              <p className="flex items-center justify-between"><span>Benefícios / adicionais</span><strong>{formatMoney(payslip.benefitsAmount?.toString())}</strong></p>
              <p className="flex items-center justify-between border-t border-border pt-2"><span>Total de proventos</span><strong>{formatMoney((gross + benefits).toFixed(2))}</strong></p>
            </div>
          </article>

          <article className="rounded-[1rem] border border-border p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Descontos</h3>
            <div className="mt-3 grid gap-2 text-sm">
              {deductionsBreakdown.map((item) => (
                <p key={item.code} className="flex items-center justify-between">
                  <span>{item.label}</span>
                  <strong>{formatMoney(item.amount)}</strong>
                </p>
              ))}
              <p className="flex items-center justify-between"><span>Total de descontos</span><strong>{formatMoney(payslip.discountsAmount?.toString())}</strong></p>
            </div>
          </article>
        </div>

        <footer className="mt-5 rounded-[1rem] bg-slate-900 px-4 py-3 text-white">
          <p className="flex items-center justify-between text-base font-semibold">
            <span>Salário líquido</span>
            <span>{formatMoney(net.toFixed(2))}</span>
          </p>
        </footer>

        {payslip.notes ? (
          <div className="mt-4 rounded-[1rem] border border-border bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {payslip.notes}
          </div>
        ) : null}
      </section>
    </div>
  );
}

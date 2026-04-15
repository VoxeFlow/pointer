import Link from "next/link";

import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";

function formatMoney(value?: string | null) {
  if (!value) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export default async function EmployeePayslipsPage() {
  const session = await requireRole("EMPLOYEE");
  const payslips = await db.payslip.findMany({
    where: {
      organizationId: session.organizationId,
      userId: session.sub,
      status: "PUBLISHED",
    },
    orderBy: [{ competenceYear: "desc" }, { competenceMonth: "desc" }],
    take: 24,
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5">
      <section className="glass rounded-[2rem] p-5">
        <h1 className="text-2xl font-semibold">Contracheques</h1>
        <p className="mt-2 text-sm text-muted">
          Consulte seus contracheques digitais, valores resumidos e arquivos disponibilizados pela empresa.
        </p>
      </section>

      <section className="glass rounded-[2rem] p-5">
        <div className="grid gap-3">
          {payslips.length === 0 ? (
            <p className="rounded-[1rem] border border-border bg-white/70 px-4 py-4 text-sm text-muted">
              Nenhum contracheque publicado ainda.
            </p>
          ) : (
            payslips.map((payslip) => (
              <article key={payslip.id} className="rounded-[1.25rem] border border-border bg-white/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold capitalize">{payslip.referenceLabel}</p>
                    <p className="mt-1 text-sm text-muted">Competência {String(payslip.competenceMonth).padStart(2, "0")}/{payslip.competenceYear}</p>
                    <div className="mt-3 grid gap-1 text-sm text-muted">
                      <p>Bruto: {formatMoney(payslip.grossAmount?.toString() ?? null)}</p>
                      <p>Benefícios: {formatMoney(payslip.benefitsAmount?.toString() ?? null)}</p>
                      <p>Descontos: {formatMoney(payslip.discountsAmount?.toString() ?? null)}</p>
                      <p className="font-semibold text-foreground">Líquido: {formatMoney(payslip.netAmount?.toString() ?? null)}</p>
                    </div>
                    {payslip.notes ? <p className="mt-2 text-sm text-muted">{payslip.notes}</p> : null}
                  </div>
                  <div className="flex flex-col items-stretch gap-2">
                    <Link
                      href={`/employee/payslips/${payslip.id}`}
                      className="rounded-full border border-border bg-white px-4 py-2 text-center text-sm font-semibold"
                    >
                      Ver contracheque
                    </Link>
                    {payslip.fileUrl ? (
                      <Link
                        href={payslip.fileUrl}
                        target="_blank"
                        className="rounded-full border border-border bg-white px-4 py-2 text-center text-sm font-semibold"
                      >
                        Baixar arquivo original
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

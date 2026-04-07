import { ReportFilterForm } from "@/components/admin/report-filter-form";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { FileBarChart, History } from "lucide-react";

export default async function AdminReportsPage() {
  const session = await requireRole("ADMIN");
  const employees = await db.user.findMany({
    where: { organizationId: session.organizationId, role: "EMPLOYEE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="rounded-[2.5rem] border border-black/5 bg-[#161616] p-8 text-white shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-highlight text-brand shadow-lg shadow-highlight/20">
            <FileBarChart className="size-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Relatórios</h1>
            <p className="mt-1 text-sm font-medium text-white/50">Gere e baixe dados consolidados de ponto em CSV.</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <main className="rounded-[2.5rem] border border-black/5 bg-white p-8 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-xl font-bold text-foreground">Exportação Customizada</h2>
              <p className="mt-2 text-sm text-balance leading-relaxed text-muted-foreground">
                Selecione o período e o funcionário desejado para gerar o arquivo CSV. O relatório contém fotos,
                geolocalização e horários oficiais validados pelo Pointer.
              </p>
            </div>

            <ReportFilterForm employees={employees} />
          </div>
        </main>

        <aside className="flex flex-col gap-6">
          <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <History className="size-5 text-brand" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Relatório Mensal</h3>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              O Pointer gera automaticamente o relatório consolidado do mês anterior todo dia 01 e envia para o e-mail cadastrado do contador.
            </p>
          </section>

          <footer className="rounded-[2rem] border border-black/5 bg-gradient-to-br from-brand/5 to-transparent p-6 text-center">
            <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
              Precisa de um formato específico para seu sistema de folha? <br />
              <span className="text-brand">Entre em contato</span>
            </p>
          </footer>
        </aside>
      </div>
    </div>
  );
}

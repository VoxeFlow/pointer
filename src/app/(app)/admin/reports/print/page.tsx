import { parseISO, endOfDay, startOfDay, isValid, format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { reportService, fmtTime, fmtMinutes, type DailyRow } from "@/services/report-service";

export default async function PrintableReportPage(props: {
  searchParams: Promise<{ from?: string; to?: string; userId?: string }>;
}) {
  const session = await requireRole("ADMIN");

  const organization = await db.organization.findUniqueOrThrow({
    where: { id: session.organizationId },
  });

  const searchParams = await props.searchParams;
  let fromDate: Date | undefined;
  let toDate: Date | undefined;

  if (searchParams.from) {
    const parsed = parseISO(searchParams.from);
    if (isValid(parsed)) fromDate = startOfDay(parsed);
  }

  if (searchParams.to) {
    const parsed = parseISO(searchParams.to);
    if (isValid(parsed)) toDate = endOfDay(parsed);
  }

  const userId = searchParams.userId || undefined;

  const rows = await reportService.buildDailyRowsForPrint(session.organizationId, {
    fromDate,
    toDate,
    userId,
  });

  let periodText = "Período Completo";
  if (fromDate && toDate)
    periodText = `${format(fromDate, "dd/MM/yyyy")} a ${format(toDate, "dd/MM/yyyy")}`;
  else if (fromDate) periodText = `A partir de ${format(fromDate, "dd/MM/yyyy")}`;
  else if (toDate) periodText = `Até ${format(toDate, "dd/MM/yyyy")}`;

  const orgName = organization.brandDisplayName || organization.name;

  // Sum totals
  const totalWorked = rows.reduce((acc, r) => acc + (r.workedMinutes ?? 0), 0);
  const totalExtra = rows.reduce((acc, r) => acc + (r.extraMinutes ?? 0), 0);

  const printScript = `window.onload = function() { setTimeout(window.print, 500); }`;
  const printCss = `
    @media print {
      @page { margin: 1.5cm; size: A4 landscape; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
      .no-print { display: none !important; }
    }
    table { border-collapse: collapse; width: 100%; }
    th, td { padding: 4px 6px; font-size: 11px; }
  `;

  return (
    <div className="bg-white min-h-screen font-sans text-black">
      <script dangerouslySetInnerHTML={{ __html: printScript }} />
      <style dangerouslySetInnerHTML={{ __html: printCss }} />

      {/* Action bar (hidden on print) */}
      <div className="no-print flex items-center gap-3 bg-gray-100 border-b px-6 py-3">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-black px-5 py-2 text-sm font-bold text-white hover:bg-gray-800"
        >
          🖨️ Imprimir / Salvar PDF
        </button>
        <button
          onClick={() => window.close()}
          className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Fechar
        </button>
        <span className="ml-auto text-xs text-gray-400">Gerado em {format(new Date(), "PPpp", { locale: ptBR })}</span>
      </div>

      <div className="mx-auto max-w-[297mm] p-8">
        {/* Company Header */}
        <header className="mb-6 flex items-start justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-4">
            {organization.brandLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={organization.brandLogoUrl} alt="Logo" className="h-14 object-contain" />
            )}
            <div>
              <h1 className="text-2xl font-black uppercase tracking-widest">{orgName}</h1>
              <h2 className="text-base font-semibold text-gray-600">Espelho de Ponto — Registro Consolidado</h2>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p><strong>Período:</strong> {periodText}</p>
            {userId && rows.length > 0 && (
              <p><strong>Funcionário:</strong> {rows[0].employeeName}</p>
            )}
            <p>Gerado em: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
          </div>
        </header>

        {/* Data Table */}
        <main>
          {rows.length === 0 ? (
            <p className="py-10 text-center text-gray-500">Nenhum registro encontrado para estes filtros.</p>
          ) : (
            <table>
              <thead>
                <tr style={{ backgroundColor: "#171717", color: "white" }}>
                  <th className="text-left rounded-tl-md">Data</th>
                  {!userId && <th className="text-left">Funcionário</th>}
                  <th className="text-center">Entrada</th>
                  <th className="text-center">Saída<br/><span className="font-normal text-[10px] opacity-70">Intervalo</span></th>
                  <th className="text-center">Entrada<br/><span className="font-normal text-[10px] opacity-70">Intervalo</span></th>
                  <th className="text-center">Saída</th>
                  <th className="text-center">Interv.<br/><span className="font-normal text-[10px] opacity-70">(min)</span></th>
                  <th className="text-center">Trabalhado<br/><span className="font-normal text-[10px] opacity-70">(hh:mm)</span></th>
                  <th className="text-center">Hora Extra<br/><span className="font-normal text-[10px] opacity-70">(hh:mm)</span></th>
                  <th className="text-center rounded-tr-md">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: DailyRow, i: number) => (
                  <tr
                    key={`${row.employeeName}-${row.date.toISOString()}`}
                    style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f8f8f8", borderBottom: "1px solid #e5e5e5" }}
                  >
                    <td className="whitespace-nowrap font-medium">{format(row.date, "dd/MM/yyyy")}</td>
                    {!userId && <td className="font-medium">{row.employeeName}</td>}
                    <td className="text-center font-mono text-green-700 font-bold">{fmtTime(row.entrada)}</td>
                    <td className="text-center font-mono text-orange-600">{fmtTime(row.saidaIntervalo)}</td>
                    <td className="text-center font-mono text-blue-600">{fmtTime(row.entradaIntervalo)}</td>
                    <td className="text-center font-mono text-red-700 font-bold">{fmtTime(row.saida)}</td>
                    <td className="text-center">{row.breaksMinutes !== null ? `${row.breaksMinutes}min` : "—"}</td>
                    <td className="text-center font-mono font-bold">{fmtMinutes(row.workedMinutes)}</td>
                    <td className={`text-center font-mono font-bold ${row.extraMinutes && row.extraMinutes > 0 ? "text-green-700" : "text-gray-400"}`}>
                      {row.extraMinutes && row.extraMinutes > 0 ? `+${fmtMinutes(row.extraMinutes)}` : "—"}
                    </td>
                    <td className={`text-center text-xs font-bold ${row.hasInconsistency ? "text-red-600" : "text-green-700"}`}>
                      {row.hasInconsistency ? "⚠️" : "✓"}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr style={{ backgroundColor: "#171717", color: "white", fontWeight: "bold" }}>
                  <td colSpan={!userId ? 7 : 6} className="text-right pr-3 text-xs uppercase tracking-wider opacity-80">Totais do período</td>
                  <td className="text-center font-mono">{fmtMinutes(totalWorked)}</td>
                  <td className="text-center font-mono text-green-300">{totalExtra > 0 ? `+${fmtMinutes(totalExtra)}` : "—"}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </main>

        {/* Signatures (single employee only) */}
        {userId && rows.length > 0 && (
          <footer className="mt-24 grid grid-cols-2 gap-16">
            <div className="border-t border-black pt-2 text-center text-sm">
              <strong>{rows[0].employeeName}</strong><br />
              <span className="text-gray-500">Funcionário</span>
            </div>
            <div className="border-t border-black pt-2 text-center text-sm">
              <strong>{orgName}</strong><br />
              <span className="text-gray-500">Responsável RH</span>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

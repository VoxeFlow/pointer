import { parseISO, endOfDay, startOfDay, isValid, format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";

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

  const records = await db.timeRecord.findMany({
    where: {
      organizationId: session.organizationId,
      userId,
      serverTimestamp: {
        gte: fromDate || undefined,
        lte: toDate || undefined,
      },
    },
    include: {
      user: true,
    },
    orderBy: [{ user: { name: "asc" } }, { serverTimestamp: "asc" }],
  });

  let periodText = "Período Completo";
  if (fromDate && toDate)
    periodText = `${format(fromDate, "dd/MM/yyyy")} a ${format(toDate, "dd/MM/yyyy")}`;
  else if (fromDate) periodText = `A partir de ${format(fromDate, "dd/MM/yyyy")}`;
  else if (toDate) periodText = `Até ${format(toDate, "dd/MM/yyyy")}`;

  const orgName = organization.brandDisplayName || organization.name;

  const printScript = `window.onload = function() { setTimeout(window.print, 500); }`;
  const printCss = `@media print { @page { margin: 1.5cm; size: A4; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white; } }`;

  return (
    <div className="mx-auto max-w-[21cm] min-h-[29.7cm] bg-white p-8 font-sans text-black print:p-0 print:m-0 print:border-none border shadow-md">
      {/* Script to trigger print automatically */}
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <script dangerouslySetInnerHTML={{ __html: printScript }} />

      {/* Print Header */}
      <header className="flex flex-col items-center border-b-2 border-black pb-6 text-center mb-6">
        {organization.brandLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={organization.brandLogoUrl} alt="Logo" className="h-16 object-contain mb-3" />
        )}
        <h1 className="text-2xl font-bold uppercase tracking-widest">{orgName}</h1>
        <h2 className="text-lg font-semibold mt-1">Espelho Consolidado de Registros de Ponto</h2>
        <p className="mt-2 text-sm text-gray-600">
          <strong>Período:</strong> {periodText}{" "}
          {userId && records.length > 0 && (
            <span>
              {" "}
              &bull; <strong>Funcionário:</strong> {records[0].user.name}
            </span>
          )}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Gerado em: {format(new Date(), "PPpp", { locale: ptBR })}
        </p>
      </header>

      {/* Data Table */}
      <main>
        {records.length === 0 ? (
          <p className="text-center text-gray-500 py-10">
            Nenhum registro encontrado para estes filtros.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-black bg-gray-100">
                  <th className="py-2 px-3 font-bold uppercase text-xs w-[120px]">Data</th>
                  <th className="py-2 px-3 font-bold uppercase text-xs w-[80px]">Hora</th>
                  {!userId && (
                    <th className="py-2 px-3 font-bold uppercase text-xs">Funcionário</th>
                  )}
                  <th className="py-2 px-3 font-bold uppercase text-xs w-[100px]">Tipo</th>
                  <th className="py-2 px-3 font-bold uppercase text-xs">Origem / Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, i) => (
                  <tr
                    key={record.id}
                    className={`border-b border-gray-200 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    <td className="py-2 px-3 whitespace-nowrap">
                      {format(record.serverTimestamp, "dd/MM/yyyy")}
                    </td>
                    <td className="py-2 px-3 font-mono font-medium">
                      {format(record.serverTimestamp, "HH:mm")}
                    </td>
                    {!userId && (
                      <td className="py-2 px-3 font-medium">{record.user.name}</td>
                    )}
                    <td className="py-2 px-3">
                      {record.recordType === "ENTRY" ? (
                        <span className="font-bold text-green-700">Entrada</span>
                      ) : (
                        <span className="font-bold text-red-700">Saída</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-600">
                      <span>
                        {{ PWA: "Aplicativo", BROWSER: "Navegador", MANUAL: "Manual" }[record.source] ?? record.source}
                      </span>
                      {(record.isInconsistent || record.inconsistencyReason) && (
                        <span className="block text-orange-600 font-medium">
                          ⚠️ {record.inconsistencyReason || "Inconsistente"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Footer / Assinaturas */}
      {userId && records.length > 0 && (
        <footer className="mt-32 pt-8 flex flex-col gap-12 print:break-inside-avoid">
          <div className="flex gap-16 justify-center text-center text-sm">
            <div className="flex-1 max-w-[300px] border-t border-black pt-2">
              <strong>{records[0].user.name}</strong>
              <br />
              <span className="text-gray-500">Funcionário</span>
            </div>
            <div className="flex-1 max-w-[300px] border-t border-black pt-2">
              <strong>{orgName}</strong>
              <br />
              <span className="text-gray-500">Responsável RH</span>
            </div>
          </div>
        </footer>
      )}

      {/* Print only CSS helpers */}
      <style dangerouslySetInnerHTML={{ __html: printCss }} />
    </div>
  );
}

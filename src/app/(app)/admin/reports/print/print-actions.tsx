"use client";

export function PrintActions({ employeeName }: { employeeName?: string }) {
  return (
    <div className="no-print flex items-center gap-3 bg-gray-100 border-b px-6 py-3">
      <button
        onClick={() => window.print()}
        className="rounded-lg bg-[#1d4ed8] px-5 py-2 text-sm font-bold text-white hover:bg-[#1e40af] transition"
      >
        🖨️ Imprimir / Salvar PDF
      </button>
      <button
        onClick={() => window.close()}
        className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
      >
        Fechar
      </button>
      {employeeName && (
        <span className="ml-4 text-sm font-medium text-gray-700">{employeeName}</span>
      )}
    </div>
  );
}

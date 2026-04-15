"use client";

export function PrintPayslipButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold"
    >
      Imprimir / Salvar PDF
    </button>
  );
}

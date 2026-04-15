"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PayslipBatchGeneratorForm() {
  const router = useRouter();
  const [competenceMonth, setCompetenceMonth] = useState(String(new Date().getMonth() + 1));
  const [competenceYear, setCompetenceYear] = useState(String(new Date().getFullYear()));
  const [submitMode, setSubmitMode] = useState<"draft" | "publish">("draft");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleGenerate() {
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/payslips/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competenceMonth: Number(competenceMonth),
          competenceYear: Number(competenceYear),
          submitMode,
        }),
      });
      const body = (await response.json()) as {
        error?: string;
        createdOrUpdatedCount?: number;
      };
      if (!response.ok) {
        setError(body.error ?? "Não foi possível gerar os contracheques em lote.");
        return;
      }

      const modeLabel = submitMode === "publish" ? "publicados" : "gerados como rascunho";
      setSuccess(
        `${body.createdOrUpdatedCount ?? 0} contracheque(s) ${modeLabel} para ${String(competenceMonth).padStart(2, "0")}/${competenceYear}. Redirecionando para a lista...`,
      );
      router.push("/admin/accounting?section=contracheques-publicados");
      router.refresh();
    } catch {
      setError("Não foi possível gerar os contracheques em lote.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid gap-3 rounded-[1rem] border border-border bg-white/75 p-4">
      <p className="text-sm font-semibold">Fechamento mensal em lote</p>
      <p className="text-xs text-muted">
        Gera contracheques de todos os funcionários ativos da competência selecionada usando perfil financeiro + cálculo de faltas/atrasos.
        Use no fim do mês para criar rascunhos e revisar antes de liberar.
      </p>
      <div className="grid gap-3 md:grid-cols-4">
        <label className="grid gap-2">
          <span className="text-xs font-semibold">Mês</span>
          <input
            type="number"
            min="1"
            max="12"
            value={competenceMonth}
            onChange={(event) => setCompetenceMonth(event.target.value)}
            className="rounded-[0.9rem] border border-border bg-white/85 px-3 py-2"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold">Ano</span>
          <input
            type="number"
            min="2024"
            max="2100"
            value={competenceYear}
            onChange={(event) => setCompetenceYear(event.target.value)}
            className="rounded-[0.9rem] border border-border bg-white/85 px-3 py-2"
          />
        </label>
        <label className="grid gap-2 md:col-span-2">
          <span className="text-xs font-semibold">Modo</span>
          <select
            value={submitMode}
            onChange={(event) => setSubmitMode(event.target.value === "publish" ? "publish" : "draft")}
            className="rounded-[0.9rem] border border-border bg-white/85 px-3 py-2"
          >
            <option value="draft">Gerar rascunhos para revisão (recomendado)</option>
            <option value="publish">Publicar todos direto (usar com cuidado)</option>
          </select>
        </label>
      </div>
      {error ? <p className="rounded-[0.9rem] bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
      {success ? (
        <div className="grid gap-2 rounded-[0.9rem] bg-brand/10 px-3 py-2 text-sm text-brand">
          <p>{success}</p>
          <button
            type="button"
            onClick={() => router.push("/admin/accounting?section=contracheques-publicados")}
            className="w-fit rounded-full border border-brand/30 bg-white/90 px-3 py-1 text-xs font-semibold text-brand transition hover:bg-white"
          >
            Abrir contracheques publicados
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={pending}
        className="rounded-[0.9rem] bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending
          ? "Processando lote..."
          : submitMode === "publish"
          ? "Executar fechamento e publicar todos"
          : "Executar fechamento e gerar rascunhos"}
      </button>
    </section>
  );
}

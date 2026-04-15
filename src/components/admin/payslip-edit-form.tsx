"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { payrollDeductionsRubrics, payrollEarningsRubrics, type PayrollItem } from "@/lib/payroll";

type Props = {
  userId: string;
  employeeName: string;
  competenceMonth: number;
  competenceYear: number;
  initialStatus: "DRAFT" | "PUBLISHED";
  initialGrossAmount: string;
  initialBenefitsAmount: string;
  initialDiscountsAmount: string;
  initialNetAmount: string;
  initialHazardAllowanceAmount: string;
  initialFamilySalaryAmount: string;
  initialOtherEarningsAmount: string;
  initialOtherEarningsRubric: string;
  initialInssAmount: string;
  initialTransportVoucherAmount: string;
  initialIrrfAmount: string;
  initialOtherDeductionsAmount: string;
  initialOtherDeductionsRubric: string;
  initialNotes: string;
};

export function PayslipEditForm({
  userId,
  employeeName,
  competenceMonth,
  competenceYear,
  initialStatus,
  initialGrossAmount,
  initialBenefitsAmount,
  initialDiscountsAmount,
  initialNetAmount,
  initialHazardAllowanceAmount,
  initialFamilySalaryAmount,
  initialOtherEarningsAmount,
  initialOtherEarningsRubric,
  initialInssAmount,
  initialTransportVoucherAmount,
  initialIrrfAmount,
  initialOtherDeductionsAmount,
  initialOtherDeductionsRubric,
  initialNotes,
}: Props) {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [calcPending, setCalcPending] = useState(false);
  const [submitMode, setSubmitMode] = useState<"draft" | "publish">(initialStatus === "PUBLISHED" ? "publish" : "draft");
  const [usePayrollProfile, setUsePayrollProfile] = useState(true);
  const [grossAmount, setGrossAmount] = useState(initialGrossAmount);
  const [benefitsAmount, setBenefitsAmount] = useState(initialBenefitsAmount);
  const [discountsAmount, setDiscountsAmount] = useState(initialDiscountsAmount);
  const [netAmount, setNetAmount] = useState(initialNetAmount);
  const [hazardAllowanceAmount, setHazardAllowanceAmount] = useState(initialHazardAllowanceAmount);
  const [familySalaryAmount, setFamilySalaryAmount] = useState(initialFamilySalaryAmount);
  const [otherEarningsAmount, setOtherEarningsAmount] = useState(initialOtherEarningsAmount);
  const [otherEarningsRubric, setOtherEarningsRubric] = useState(initialOtherEarningsRubric);
  const [inssAmount, setInssAmount] = useState(initialInssAmount);
  const [transportVoucherAmount, setTransportVoucherAmount] = useState(initialTransportVoucherAmount);
  const [irrfAmount, setIrrfAmount] = useState(initialIrrfAmount);
  const [otherDeductionsAmount, setOtherDeductionsAmount] = useState(initialOtherDeductionsAmount);
  const [otherDeductionsRubric, setOtherDeductionsRubric] = useState(initialOtherDeductionsRubric);
  const [notes, setNotes] = useState(initialNotes);
  const [calculationSummary, setCalculationSummary] = useState<{
    missingMinutesTotal: number;
    lateMinutesTotal: number;
    absentDays: number;
    partialMissingDays: number;
    justifiedAbsenceDays: number;
    suggestedAbsenceDeduction: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function formatMinutes(value: number) {
    const safe = Math.max(0, Math.round(value));
    const hours = Math.floor(safe / 60);
    const minutes = safe % 60;
    return `${hours}h${String(minutes).padStart(2, "0")}min`;
  }

  async function handleCalculateAttendanceBase() {
    setCalcPending(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userId,
        competenceMonth: String(competenceMonth),
        competenceYear: String(competenceYear),
      });
      const response = await fetch(`/api/admin/payroll-preview?${params.toString()}`);
      const body = (await response.json()) as {
        error?: string;
        summary?: {
          missingMinutesTotal: number;
          lateMinutesTotal: number;
          absentDays: number;
          partialMissingDays: number;
          justifiedAbsenceDays: number;
        };
        financial?: {
          suggestedAbsenceDeduction: number;
        };
      };

      if (!response.ok || !body.summary || !body.financial) {
        setError(body.error ?? "Não foi possível calcular faltas e atrasos.");
        return;
      }

      const suggested = Number(body.financial.suggestedAbsenceDeduction ?? 0);
      setCalculationSummary({
        ...body.summary,
        suggestedAbsenceDeduction: suggested,
      });
      setOtherDeductionsRubric("FALTA_ATRASO|Faltas e atrasos");
      setOtherDeductionsAmount(suggested > 0 ? suggested.toFixed(2) : "0.00");
    } catch {
      setError("Não foi possível calcular faltas e atrasos.");
    } finally {
      setCalcPending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLockRef.current) {
      return;
    }
    submitLockRef.current = true;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const mode = submitter?.value === "draft" ? "draft" : "publish";
    setSubmitMode(mode);
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData(event.currentTarget);
      formData.set("submitMode", mode);
      if (usePayrollProfile) {
        formData.set("usePayrollProfile", "on");
      } else {
        formData.delete("usePayrollProfile");
      }
      const response = await fetch("/api/admin/payslips", {
        method: "POST",
        body: formData,
      });

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setSuccess(null);
        setError(body.error ?? "Não foi possível salvar o contracheque.");
        return;
      }

      setError(null);
      setSuccess(mode === "draft" ? "Rascunho atualizado com sucesso." : "Contracheque publicado com sucesso.");
      router.refresh();
    } catch {
      setSuccess(null);
      setError("Não foi possível salvar o contracheque.");
    } finally {
      setPending(false);
      submitLockRef.current = false;
    }
  }

  return (
    <form className="mt-4 grid gap-4 rounded-[1.25rem] border border-border bg-white/80 p-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <p className="text-sm text-muted">
          Editando contracheque de <strong>{employeeName}</strong> • {String(competenceMonth).padStart(2, "0")}/{competenceYear}
        </p>
        <label className="flex items-center justify-end gap-2 text-sm font-semibold">
          <input type="checkbox" checked={usePayrollProfile} onChange={(event) => setUsePayrollProfile(event.target.checked)} />
          Aplicar perfil financeiro como base
        </label>
      </div>

      <div className="rounded-[1rem] border border-border bg-white/75 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Base automática de faltas e atrasos</p>
            <p className="text-xs text-muted">
              Recalcula ausências e atraso para ajustar automaticamente a rubrica de desconto.
            </p>
          </div>
          <button
            type="button"
            disabled={calcPending || pending}
            onClick={handleCalculateAttendanceBase}
            className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold transition hover:bg-muted/30 disabled:opacity-60"
          >
            {calcPending ? "Calculando..." : "Calcular faltas/atrasos"}
          </button>
        </div>
        {calculationSummary ? (
          <div className="mt-3 grid gap-2 rounded-[0.9rem] border border-border bg-white/85 p-3 text-sm text-muted md:grid-cols-2">
            <p>Faltas integrais: <strong>{calculationSummary.absentDays}</strong></p>
            <p>Dias parciais com falta: <strong>{calculationSummary.partialMissingDays}</strong></p>
            <p>Dias justificados por atestado: <strong>{calculationSummary.justifiedAbsenceDays}</strong></p>
            <p>Atrasos acumulados: <strong>{formatMinutes(calculationSummary.lateMinutesTotal)}</strong></p>
            <p>Minutos em falta: <strong>{formatMinutes(calculationSummary.missingMinutesTotal)}</strong></p>
            <p>
              Desconto sugerido (FALTA_ATRASO):{" "}
              <strong>
                {calculationSummary.suggestedAbsenceDeduction.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </strong>
            </p>
          </div>
        ) : null}
      </div>

      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="competenceMonth" value={String(competenceMonth)} />
      <input type="hidden" name="competenceYear" value={String(competenceYear)} />

      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Salário bruto</span>
          <input name="grossAmount" value={grossAmount} onChange={(event) => setGrossAmount(event.target.value)} className="w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
        </label>
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Benefícios</span>
          <input name="benefitsAmount" value={benefitsAmount} onChange={(event) => setBenefitsAmount(event.target.value)} className="w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
        </label>
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Descontos</span>
          <input name="discountsAmount" value={discountsAmount} onChange={(event) => setDiscountsAmount(event.target.value)} className="w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
        </label>
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Líquido</span>
          <input name="netAmount" value={netAmount} onChange={(event) => setNetAmount(event.target.value)} placeholder="Se vazio, o sistema calcula automaticamente" className="w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
        </label>
      </div>

      <details className="grid gap-3 rounded-[1rem] border border-border bg-white/70 p-4">
        <summary className="cursor-pointer text-sm font-semibold">Ajustes avançados (opcional)</summary>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid min-w-0 gap-2">
            <span className="text-sm font-semibold">Adicional de insalubridade</span>
            <input name="hazardAllowanceAmount" value={hazardAllowanceAmount} onChange={(event) => setHazardAllowanceAmount(event.target.value)} className="w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
          </label>
          <label className="grid min-w-0 gap-2">
            <span className="text-sm font-semibold">Salário-família</span>
            <input name="familySalaryAmount" value={familySalaryAmount} onChange={(event) => setFamilySalaryAmount(event.target.value)} className="w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
          </label>
          <label className="grid min-w-0 gap-2">
            <span className="text-sm font-semibold">Rubrica de provento (eSocial)</span>
            <select name="otherEarningsRubric" value={otherEarningsRubric} onChange={(event) => setOtherEarningsRubric(event.target.value)} className="w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3">
              {payrollEarningsRubrics.map((rubric) => (
                <option key={rubric.code} value={`${rubric.code}|${rubric.label}`}>
                  {rubric.code} - {rubric.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-2">
            <span className="text-sm font-semibold">Valor da rubrica de provento</span>
            <input name="otherEarningsAmount" value={otherEarningsAmount} onChange={(event) => setOtherEarningsAmount(event.target.value)} className="w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid min-w-0 gap-2">
            <span className="text-sm font-semibold">INSS</span>
            <input name="inssAmount" value={inssAmount} onChange={(event) => setInssAmount(event.target.value)} className="w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
          </label>
          <label className="grid min-w-0 gap-2">
            <span className="text-sm font-semibold">Vale-transporte</span>
            <input name="transportVoucherAmount" value={transportVoucherAmount} onChange={(event) => setTransportVoucherAmount(event.target.value)} className="w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
          </label>
          <label className="grid min-w-0 gap-2">
            <span className="text-sm font-semibold">IRRF</span>
            <input name="irrfAmount" value={irrfAmount} onChange={(event) => setIrrfAmount(event.target.value)} className="w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
          </label>
          <label className="grid min-w-0 gap-2">
            <span className="text-sm font-semibold">Rubrica de desconto (eSocial)</span>
            <select name="otherDeductionsRubric" value={otherDeductionsRubric} onChange={(event) => setOtherDeductionsRubric(event.target.value)} className="w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3">
              {payrollDeductionsRubrics.map((rubric) => (
                <option key={rubric.code} value={`${rubric.code}|${rubric.label}`}>
                  {rubric.code} - {rubric.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-2">
            <span className="text-sm font-semibold">Valor da rubrica de desconto</span>
            <input name="otherDeductionsAmount" value={otherDeductionsAmount} onChange={(event) => setOtherDeductionsAmount(event.target.value)} className="w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
          </label>
        </div>
      </details>

      <label className="grid gap-2">
        <span className="text-sm font-semibold">Arquivo do contracheque (PDF)</span>
        <input type="file" name="file" accept=".pdf,image/png,image/jpeg" className="rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold">Observações</span>
        <textarea
          name="notes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Resumo do mês, benefícios aplicados ou observações para o colaborador."
          className="rounded-[1rem] border border-border bg-white/85 px-4 py-3"
        />
      </label>

      {error ? <p className="rounded-[1rem] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
      {success ? <p className="rounded-[1rem] bg-brand/10 px-4 py-3 text-sm text-brand">{success}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="submit"
          disabled={pending}
          value="draft"
          className="rounded-[1rem] border border-border bg-white px-4 py-4 font-semibold text-foreground transition hover:bg-muted/30 disabled:opacity-60"
        >
          {pending && submitMode === "draft" ? "Salvando..." : "Salvar rascunho"}
        </button>
        <button
          type="submit"
          disabled={pending}
          value="publish"
          className="rounded-[1rem] bg-brand px-4 py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
        >
          {pending && submitMode === "publish" ? "Publicando..." : "Publicar contracheque"}
        </button>
      </div>
    </form>
  );
}

export function getItemAmountByCode(items: PayrollItem[], code: string) {
  return items.find((item) => item.code === code)?.amount ?? "";
}

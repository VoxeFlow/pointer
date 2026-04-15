"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { payrollDeductionsRubrics, payrollEarningsRubrics } from "@/lib/payroll";

type EmployeeOption = {
  id: string;
  name: string;
  payrollProfilePosition: string | null;
  payrollBaseSalary: { toString(): string } | string | null;
  payrollBenefitsAmount: { toString(): string } | string | null;
  payrollDiscountsAmount: { toString(): string } | string | null;
  payrollEarningsTemplateJson?: unknown;
  payrollDeductionsTemplateJson?: unknown;
};

function toInputValue(value: { toString(): string } | string | null) {
  if (!value) return "";
  return value.toString().replace(".", ",");
}

export function PayrollProfileForm({ employees }: { employees: EmployeeOption[] }) {
  const router = useRouter();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [position, setPosition] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [benefitsAmount, setBenefitsAmount] = useState("");
  const [discountsAmount, setDiscountsAmount] = useState("");
  const [hazardAllowanceAmount, setHazardAllowanceAmount] = useState("");
  const [familySalaryAmount, setFamilySalaryAmount] = useState("");
  const [otherEarningsAmount, setOtherEarningsAmount] = useState("");
  const [otherEarningsRubric, setOtherEarningsRubric] = useState("OUTROS_PROVENTOS|Outros proventos");
  const [inssAmount, setInssAmount] = useState("");
  const [transportVoucherAmount, setTransportVoucherAmount] = useState("");
  const [irrfAmount, setIrrfAmount] = useState("");
  const [otherDeductionsAmount, setOtherDeductionsAmount] = useState("");
  const [otherDeductionsRubric, setOtherDeductionsRubric] = useState("OUTROS_DESCONTOS|Outros descontos");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  );

  function applyDefaults(employeeId: string) {
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) {
      setPosition("");
      setBaseSalary("");
      setBenefitsAmount("");
      setDiscountsAmount("");
      setHazardAllowanceAmount("");
      setFamilySalaryAmount("");
      setOtherEarningsAmount("");
      setOtherEarningsRubric("OUTROS_PROVENTOS|Outros proventos");
      setInssAmount("");
      setTransportVoucherAmount("");
      setIrrfAmount("");
      setOtherDeductionsAmount("");
      setOtherDeductionsRubric("OUTROS_DESCONTOS|Outros descontos");
      return;
    }

    setPosition(employee.payrollProfilePosition ?? "");
    setBaseSalary(toInputValue(employee.payrollBaseSalary));
    setBenefitsAmount(toInputValue(employee.payrollBenefitsAmount));
    setDiscountsAmount(toInputValue(employee.payrollDiscountsAmount));

    const earnings = Array.isArray(employee.payrollEarningsTemplateJson) ? employee.payrollEarningsTemplateJson : [];
    const deductions = Array.isArray(employee.payrollDeductionsTemplateJson) ? employee.payrollDeductionsTemplateJson : [];
    const findItemByCodes = (items: unknown[], codes: string[]) => {
      return items.find(
        (item) =>
          item &&
          typeof item === "object" &&
          "code" in (item as Record<string, unknown>) &&
          codes.includes(String((item as Record<string, unknown>).code)),
      );
    };
    const getAmount = (items: unknown[], code: string) => {
      const found = findItemByCodes(items, [code]);
      if (!found || typeof found !== "object") return "";
      const amount = (found as Record<string, unknown>).amount;
      return typeof amount === "string" ? amount.replace(".", ",") : "";
    };

    setHazardAllowanceAmount(getAmount(earnings, "ADICIONAL_INSALUBRIDADE"));
    setFamilySalaryAmount(getAmount(earnings, "SALARIO_FAMILIA"));
    const otherEarningsItem = findItemByCodes(earnings, ["OUTROS_PROVENTOS", "HORA_EXTRA_50", "HORA_EXTRA_100", "ADICIONAL_NOTURNO", "COMISSOES", "DSR_SOBRE_VARIAVEIS", "GRATIFICACAO"]);
    if (otherEarningsItem && typeof otherEarningsItem === "object") {
      const code = String((otherEarningsItem as Record<string, unknown>).code ?? "OUTROS_PROVENTOS");
      const label = String((otherEarningsItem as Record<string, unknown>).label ?? "Outros proventos");
      const amount = (otherEarningsItem as Record<string, unknown>).amount;
      setOtherEarningsRubric(`${code}|${label}`);
      setOtherEarningsAmount(typeof amount === "string" ? amount.replace(".", ",") : "");
    } else {
      setOtherEarningsRubric("OUTROS_PROVENTOS|Outros proventos");
      setOtherEarningsAmount("");
    }
    setInssAmount(getAmount(deductions, "INSS"));
    setTransportVoucherAmount(getAmount(deductions, "VALE_TRANSPORTE"));
    setIrrfAmount(getAmount(deductions, "IRRF"));
    const otherDeductionItem = findItemByCodes(deductions, ["OUTROS_DESCONTOS", "PENSAO_ALIMENTICIA", "FALTA_ATRASO", "ADIANTAMENTO_SALARIAL", "CONTRIBUICAO_SINDICAL"]);
    if (otherDeductionItem && typeof otherDeductionItem === "object") {
      const code = String((otherDeductionItem as Record<string, unknown>).code ?? "OUTROS_DESCONTOS");
      const label = String((otherDeductionItem as Record<string, unknown>).label ?? "Outros descontos");
      const amount = (otherDeductionItem as Record<string, unknown>).amount;
      setOtherDeductionsRubric(`${code}|${label}`);
      setOtherDeductionsAmount(typeof amount === "string" ? amount.replace(".", ",") : "");
    } else {
      setOtherDeductionsRubric("OUTROS_DESCONTOS|Outros descontos");
      setOtherDeductionsAmount("");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/payroll-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedEmployeeId,
          position,
          baseSalary,
          benefitsAmount,
          discountsAmount,
          hazardAllowanceAmount,
          familySalaryAmount,
          otherEarningsAmount,
          otherEarningsRubric,
          inssAmount,
          transportVoucherAmount,
          irrfAmount,
          otherDeductionsAmount,
          otherDeductionsRubric,
        }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Nao foi possivel salvar o perfil financeiro.");
        return;
      }

      setSuccess("Perfil financeiro salvo com sucesso.");
      router.refresh();
    } catch {
      setError("Nao foi possivel salvar o perfil financeiro.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Funcionário</span>
          <select
            value={selectedEmployeeId}
            onChange={(event) => {
              const nextId = event.target.value;
              setSelectedEmployeeId(nextId);
              applyDefaults(nextId);
            }}
            required
            className="w-full min-w-0 max-w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          >
            <option value="">Selecione</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Cargo (opcional)</span>
          <input
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            placeholder="Recepcionista, Auxiliar, Tecnico..."
            className="w-full min-w-0 max-w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Salário base</span>
          <input
            value={baseSalary}
            onChange={(event) => setBaseSalary(event.target.value)}
            placeholder="2500,00"
            className="w-full min-w-0 max-w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Benefícios padrão</span>
          <input
            value={benefitsAmount}
            onChange={(event) => setBenefitsAmount(event.target.value)}
            placeholder="350,00"
            className="w-full min-w-0 max-w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Descontos padrão</span>
          <input
            value={discountsAmount}
            onChange={(event) => setDiscountsAmount(event.target.value)}
            placeholder="180,00"
            className="w-full min-w-0 max-w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Insalubridade (padrão)</span>
          <input
            value={hazardAllowanceAmount}
            onChange={(event) => setHazardAllowanceAmount(event.target.value)}
            placeholder="0,00"
            className="w-full min-w-0 max-w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Salário-família (padrão)</span>
          <input
            value={familySalaryAmount}
            onChange={(event) => setFamilySalaryAmount(event.target.value)}
            placeholder="0,00"
            className="w-full min-w-0 max-w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Rubrica de provento (eSocial)</span>
          <select
            value={otherEarningsRubric}
            onChange={(event) => setOtherEarningsRubric(event.target.value)}
            className="w-full min-w-0 max-w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          >
            {payrollEarningsRubrics.map((rubric) => (
              <option key={rubric.code} value={`${rubric.code}|${rubric.label}`}>
                {rubric.code} - {rubric.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Valor da rubrica de provento</span>
          <input
            value={otherEarningsAmount}
            onChange={(event) => setOtherEarningsAmount(event.target.value)}
            placeholder="0,00"
            className="w-full min-w-0 max-w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">INSS (padrão)</span>
          <input
            value={inssAmount}
            onChange={(event) => setInssAmount(event.target.value)}
            placeholder="0,00"
            className="w-full min-w-0 max-w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Vale-transporte (padrão)</span>
          <input
            value={transportVoucherAmount}
            onChange={(event) => setTransportVoucherAmount(event.target.value)}
            placeholder="0,00"
            className="w-full min-w-0 max-w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">IRRF (padrão)</span>
          <input
            value={irrfAmount}
            onChange={(event) => setIrrfAmount(event.target.value)}
            placeholder="0,00"
            className="w-full min-w-0 max-w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Rubrica de desconto (eSocial)</span>
          <select
            value={otherDeductionsRubric}
            onChange={(event) => setOtherDeductionsRubric(event.target.value)}
            className="w-full min-w-0 max-w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          >
            {payrollDeductionsRubrics.map((rubric) => (
              <option key={rubric.code} value={`${rubric.code}|${rubric.label}`}>
                {rubric.code} - {rubric.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Valor da rubrica de desconto</span>
          <input
            value={otherDeductionsAmount}
            onChange={(event) => setOtherDeductionsAmount(event.target.value)}
            placeholder="0,00"
            className="w-full min-w-0 max-w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
      </div>

      {selectedEmployee ? (
        <p className="text-sm text-muted">
          Perfil atual de {selectedEmployee.name}: salário {toInputValue(selectedEmployee.payrollBaseSalary) || "nao cadastrado"}.
        </p>
      ) : null}

      {error ? <p className="rounded-[1rem] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
      {success ? <p className="rounded-[1rem] bg-brand/10 px-4 py-3 text-sm text-brand">{success}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[1rem] bg-brand px-4 py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar perfil financeiro"}
      </button>
    </form>
  );
}

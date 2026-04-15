export type PayrollItem = {
  code: string;
  label: string;
  amount: string;
};

export const payrollEarningsRubrics = [
  { code: "ADICIONAL_INSALUBRIDADE", label: "Adicional de insalubridade" },
  { code: "SALARIO_FAMILIA", label: "Salário-família" },
  { code: "HORA_EXTRA_50", label: "Hora extra 50%" },
  { code: "HORA_EXTRA_100", label: "Hora extra 100%" },
  { code: "ADICIONAL_NOTURNO", label: "Adicional noturno" },
  { code: "COMISSOES", label: "Comissões" },
  { code: "DSR_SOBRE_VARIAVEIS", label: "DSR sobre variáveis" },
  { code: "GRATIFICACAO", label: "Gratificação" },
  { code: "OUTROS_PROVENTOS", label: "Outros proventos" },
] as const;

export const payrollDeductionsRubrics = [
  { code: "INSS", label: "INSS" },
  { code: "IRRF", label: "IRRF" },
  { code: "VALE_TRANSPORTE", label: "Vale-transporte" },
  { code: "PENSAO_ALIMENTICIA", label: "Pensão alimentícia" },
  { code: "FALTA_ATRASO", label: "Faltas e atrasos" },
  { code: "ADIANTAMENTO_SALARIAL", label: "Adiantamento salarial" },
  { code: "CONTRIBUICAO_SINDICAL", label: "Contribuição sindical" },
  { code: "OUTROS_DESCONTOS", label: "Outros descontos" },
] as const;

export function parseRubricValue(raw: string | null | undefined, fallbackCode: string, fallbackLabel: string) {
  const value = raw?.trim() ?? "";
  if (!value) return { code: fallbackCode, label: fallbackLabel };
  const [code, label] = value.split("|");
  if (!code || !label) return { code: fallbackCode, label: fallbackLabel };
  return { code: code.trim(), label: label.trim() };
}

function normalizeMoneyToFixed(value: string | null | undefined) {
  if (!value || !value.trim()) return null;
  const raw = value.trim().replace(/\s/g, "");
  let normalized = raw;

  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  if (hasComma && hasDot) {
    const lastComma = raw.lastIndexOf(",");
    const lastDot = raw.lastIndexOf(".");
    if (lastComma > lastDot) {
      // pt-BR style: 1.234,56
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else {
      // en-US style: 1,234.56
      normalized = raw.replace(/,/g, "");
    }
  } else if (hasComma) {
    // pt-BR decimal: 1234,56
    normalized = raw.replace(",", ".");
  } else if (hasDot) {
    const parts = raw.split(".");
    if (parts.length > 2) {
      const decimal = parts.pop() ?? "00";
      normalized = `${parts.join("")}.${decimal}`;
    } else {
      const [intPart, decimalPart = ""] = parts;
      if (decimalPart.length === 3) {
        // thousands separator style: 1.234
        normalized = `${intPart}${decimalPart}`;
      } else {
        normalized = raw;
      }
    }
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed.toFixed(2);
}

export function parseMoneyInput(value: string | null | undefined) {
  return normalizeMoneyToFixed(value);
}

export function parsePayrollItems(raw: unknown): PayrollItem[] {
  if (!Array.isArray(raw)) return [];
  const items: PayrollItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const code = "code" in item && typeof item.code === "string" ? item.code.trim() : "";
    const label = "label" in item && typeof item.label === "string" ? item.label.trim() : "";
    const amountRaw = "amount" in item && typeof item.amount === "string" ? item.amount : "";
    const amount = parseMoneyInput(amountRaw);
    if (!code || !label || !amount || Number(amount) <= 0) continue;
    items.push({ code, label, amount });
  }
  return items;
}

export function moneySum(items: PayrollItem[]) {
  return items.reduce((sum, item) => sum + Number(item.amount), 0);
}

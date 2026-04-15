"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type EmployeeOption = {
  id: string;
  name: string;
};

export function PayslipUploadForm({ employees }: { employees: EmployeeOption[] }) {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [submitMode, setSubmitMode] = useState<"draft" | "publish">("publish");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [competenceMonth, setCompetenceMonth] = useState(String(new Date().getMonth() + 1));
  const [competenceYear, setCompetenceYear] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      setSuccess(mode === "draft" ? "Rascunho salvo com sucesso." : "Contracheque publicado com sucesso.");
      event.currentTarget.reset();
      setSelectedUserId("");
      setCompetenceMonth(String(new Date().getMonth() + 1));
      setCompetenceYear(String(new Date().getFullYear()));
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
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Funcionário</span>
          <select
            name="userId"
            required
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
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
          <span className="text-sm font-semibold">Mês</span>
          <input
            type="number"
            name="competenceMonth"
            min="1"
            max="12"
            value={competenceMonth}
            onChange={(event) => setCompetenceMonth(event.target.value)}
            className="w-full min-w-0 max-w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold">Ano</span>
          <input
            type="number"
            name="competenceYear"
            min="2024"
            max="2100"
            value={competenceYear}
            onChange={(event) => setCompetenceYear(event.target.value)}
            className="w-full min-w-0 max-w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
      </div>

      <label className="grid min-w-0 gap-2">
        <span className="text-sm font-semibold">Arquivo do contracheque (PDF)</span>
        <input
          type="file"
          name="file"
          accept=".pdf,image/png,image/jpeg"
          className="w-full min-w-0 max-w-full rounded-[1rem] border border-border bg-white/85 px-4 py-3"
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

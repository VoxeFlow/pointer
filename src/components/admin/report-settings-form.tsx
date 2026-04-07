"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReportSettingsForm({
  accountantReportEmail,
  monthlyReportEnabled,
}: {
  accountantReportEmail: string | null;
  monthlyReportEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as { error?: string };

    setPending(false);

    if (!response.ok) {
      setError(body.error ?? "Nao foi possivel salvar as configuracoes.");
      return;
    }

    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2">
        <span className="text-sm font-semibold">E-mail do contador</span>
        <input
          type="email"
          name="accountantReportEmail"
          defaultValue={accountantReportEmail ?? ""}
          placeholder="contador@empresa.com"
          className="rounded-[1rem] border border-border bg-white/80 px-4 py-3"
        />
      </label>

      <label className="flex items-center gap-3 rounded-[1rem] border border-border bg-white/70 px-4 py-3">
        <input type="checkbox" name="monthlyReportEnabled" defaultChecked={monthlyReportEnabled} />
        <span className="text-sm font-semibold">Enviar relatorio mensal automaticamente no dia 1</span>
      </label>

      {error ? <p className="rounded-[1rem] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[1rem] bg-brand px-4 py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar configuracoes do relatorio"}
      </button>
    </form>
  );
}

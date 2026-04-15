"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MedicalCertificateUploadForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/employee/medical-certificates", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(body.error ?? "Nao foi possivel enviar o atestado.");
        return;
      }

      setSuccess("Atestado enviado com sucesso para análise.");
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setError("Nao foi possivel enviar o atestado.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Data de emissão</span>
          <input type="date" name="issueDate" className="rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Início do afastamento</span>
          <input type="date" name="startDate" className="rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Fim do afastamento</span>
          <input type="date" name="endDate" className="rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold">Observações</span>
        <textarea
          name="notes"
          rows={3}
          placeholder="Descreva o afastamento ou instruções relevantes para o RH/contador."
          className="rounded-[1rem] border border-border bg-white/85 px-4 py-3"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold">Arquivo do atestado</span>
        <input
          type="file"
          name="file"
          required
          accept=".pdf,image/png,image/jpeg,image/webp"
          className="rounded-[1rem] border border-border bg-white/85 px-4 py-3"
        />
      </label>

      {error ? <p className="rounded-[1rem] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
      {success ? <p className="rounded-[1rem] bg-brand/10 px-4 py-3 text-sm text-brand">{success}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[1rem] bg-brand px-4 py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar atestado"}
      </button>
    </form>
  );
}

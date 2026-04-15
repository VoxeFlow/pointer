"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CertificateStatus = "SUBMITTED" | "REVIEWED" | "ACCEPTED" | "REJECTED";

export function MedicalCertificateReviewForm({
  certificateId,
  status,
}: {
  certificateId: string;
  status: CertificateStatus;
}) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState<CertificateStatus>(
    status === "SUBMITTED" ? "REVIEWED" : status,
  );
  const [reviewNote, setReviewNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/medical-certificates/${certificateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, reviewNote }),
      });

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(body.error ?? "Nao foi possivel atualizar o atestado.");
        return;
      }

      setSuccess("Atestado atualizado.");
      router.refresh();
    } catch {
      setError("Nao foi possivel atualizar o atestado.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-2" onSubmit={handleSubmit}>
      <select
        value={nextStatus}
        onChange={(event) => setNextStatus(event.target.value as CertificateStatus)}
        className="rounded-full border border-border bg-white px-3 py-2 text-xs font-semibold"
      >
        <option value="REVIEWED">Marcar como revisado</option>
        <option value="ACCEPTED">Aceitar atestado</option>
        <option value="REJECTED">Rejeitar atestado</option>
      </select>
      <input
        value={reviewNote}
        onChange={(event) => setReviewNote(event.target.value)}
        placeholder="Comentário (opcional)"
        className="rounded-full border border-border bg-white px-3 py-2 text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar revisão"}
      </button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      {success ? <p className="text-xs text-emerald-700">{success}</p> : null}
    </form>
  );
}

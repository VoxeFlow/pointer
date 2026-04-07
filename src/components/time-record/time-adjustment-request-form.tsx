"use client";

import { useState } from "react";
import { RecordType, TimeAdjustmentRequestStatus } from "@prisma/client";
import { LoaderCircle, Send } from "lucide-react";

type ExistingRequest = {
  id: string;
  requestedDate: string;
  requestedTime: string | null;
  requestedType: RecordType | null;
  status: TimeAdjustmentRequestStatus;
  reason: string;
  reviewNote: string | null;
  createdAt: string;
};

const recordTypeOptions: Array<{ value: RecordType; label: string }> = [
  { value: RecordType.ENTRY, label: "Entrada" },
  { value: RecordType.BREAK_OUT, label: "Saída para intervalo" },
  { value: RecordType.BREAK_IN, label: "Retorno do intervalo" },
  { value: RecordType.EXIT, label: "Saída final" },
];

function getStatusLabel(status: TimeAdjustmentRequestStatus) {
  return {
    OPEN: "Em análise",
    REVIEWED: "Em revisão",
    APPROVED: "Aprovado",
    REJECTED: "Recusado",
  }[status];
}

export function TimeAdjustmentRequestForm({
  initialRequests,
}: {
  initialRequests: ExistingRequest[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [requestedDate, setRequestedDate] = useState("");
  const [requestedTime, setRequestedTime] = useState("");
  const [requestedType, setRequestedType] = useState<RecordType | "">("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsPending(true);

    try {
      const response = await fetch("/api/time-adjustment-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestedDate,
          requestedTime,
          requestedType: requestedType || null,
          reason,
        }),
      });

      const payload = (await response.json()) as { error?: string; id?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nao foi possivel enviar a solicitacao.");
      }

      const nextRequest: ExistingRequest = {
        id: payload.id ?? crypto.randomUUID(),
        requestedDate,
        requestedTime: requestedTime || null,
        requestedType: requestedType || null,
        status: TimeAdjustmentRequestStatus.OPEN,
        reason,
        reviewNote: null,
        createdAt: new Date().toISOString(),
      };

      setRequests((current) => [nextRequest, ...current]);
      setRequestedDate("");
      setRequestedTime("");
      setRequestedType("");
      setReason("");
      setSuccess("Solicitação enviada para análise do administrador.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-[1.8rem] bg-white p-5 shadow-[0_14px_28px_rgba(0,0,0,0.04)]">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#5f27d8]">Acerto de ponto</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#1d1830]">Solicitar ajuste</h2>
          <p className="mt-2 text-sm text-muted">
            Use quando precisar pedir correção de horário, inclusão de marcação ou justificar uma inconsistência.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[#1d1830]">Data do ajuste</span>
              <input
                type="date"
                value={requestedDate}
                onChange={(event) => setRequestedDate(event.target.value)}
                required
                className="rounded-[1.1rem] border border-border bg-[#faf8f4] px-4 py-3 outline-none transition focus:border-[#5f27d8]"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-[#1d1830]">Horário desejado</span>
              <input
                type="time"
                value={requestedTime}
                onChange={(event) => setRequestedTime(event.target.value)}
                className="rounded-[1.1rem] border border-border bg-[#faf8f4] px-4 py-3 outline-none transition focus:border-[#5f27d8]"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#1d1830]">Tipo de marcação</span>
            <select
              value={requestedType}
              onChange={(event) => setRequestedType(event.target.value as RecordType | "")}
              className="rounded-[1.1rem] border border-border bg-[#faf8f4] px-4 py-3 outline-none transition focus:border-[#5f27d8]"
            >
              <option value="">Não informar agora</option>
              {recordTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#1d1830]">Motivo</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              rows={4}
              className="rounded-[1.1rem] border border-border bg-[#faf8f4] px-4 py-3 outline-none transition focus:border-[#5f27d8]"
              placeholder="Explique o que aconteceu para o admin entender e decidir o ajuste."
            />
          </label>

          {error ? <p className="rounded-[1rem] border border-[#7a2d2d] bg-[#fff0f0] px-4 py-3 text-sm text-[#9d2e2e]">{error}</p> : null}
          {success ? <p className="rounded-[1rem] border border-[#cfc3f3] bg-[#f4efff] px-4 py-3 text-sm text-[#5f27d8]">{success}</p> : null}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-[1.2rem] bg-[#5f27d8] px-4 py-4 font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}
            {isPending ? "Enviando..." : "Enviar solicitação"}
          </button>
        </form>
      </section>

      <section className="rounded-[1.8rem] bg-white p-5 shadow-[0_14px_28px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#5f27d8]">Solicitações</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#1d1830]">Acompanhamento</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {requests.length ? (
            requests.map((request) => (
              <article key={request.id} className="rounded-[1.25rem] bg-[#faf8f4] px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#1d1830]">
                      {new Date(`${request.requestedDate}T12:00:00`).toLocaleDateString("pt-BR")}
                      {request.requestedTime ? ` às ${request.requestedTime}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {request.requestedType
                        ? recordTypeOptions.find((option) => option.value === request.requestedType)?.label
                        : "Tipo não informado"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#ece3ff] px-3 py-1 text-sm font-semibold text-[#5f27d8]">
                    {getStatusLabel(request.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[#322b43]">{request.reason}</p>
                {request.reviewNote ? <p className="mt-3 text-sm text-muted">Retorno do admin: {request.reviewNote}</p> : null}
              </article>
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-border bg-[#faf8f4] px-4 py-6 text-sm text-muted">
              Nenhuma solicitação enviada até agora.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

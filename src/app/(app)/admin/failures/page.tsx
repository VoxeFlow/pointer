import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";

const failureActionLabels: Record<string, string> = {
  time_record_client_failure: "Falha no aparelho/app",
  time_record_location_missing: "Localização ausente",
  time_record_photo_upload_failed: "Falha ao salvar foto",
  time_record_blocked_outside_worksite_radius: "Fora da área permitida",
  time_record_blocked_day_off: "Tentativa em dia de folga",
  time_record_blocked_limit: "Limite diário atingido",
  time_record_manual_replacement: "Ajuste auditado criado",
};

export default async function AdminFailuresPage() {
  const session = await requireRole("ADMIN");

  const failures = await db.auditLog.findMany({
    where: {
      organizationId: session.organizationId,
      action: {
        in: [
          "time_record_client_failure",
          "time_record_location_missing",
          "time_record_photo_upload_failed",
          "time_record_blocked_outside_worksite_radius",
          "time_record_blocked_day_off",
          "time_record_blocked_limit",
        ],
      },
    },
    include: {
      actorUser: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <section className="glass rounded-[2rem] p-5">
        <h1 className="text-2xl font-semibold">Falhas de registro</h1>
        <p className="mt-2 text-sm text-muted">
          Visão operacional das falhas e bloqueios de registro, incluindo problemas que aconteceram no aparelho antes de chegar ao backend.
        </p>
      </section>

      <section className="mt-4 grid gap-4">
        {failures.length ? (
          failures.map((failure) => (
            <article key={failure.id} className="glass rounded-[1.5rem] p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">
                    {failure.actorUser?.name ?? "Usuário não identificado"}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {failureActionLabels[failure.action] ?? failure.action}
                  </p>
                  <p className="mt-1 text-xs text-muted">{formatDateTime(failure.createdAt)}</p>
                </div>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                  {failure.targetType}
                </span>
              </div>

              <div className="mt-4 rounded-[1rem] bg-white/70 p-4 text-sm text-foreground">
                <p>
                  {(failure.metadataJson as Record<string, unknown> | null)?.message?.toString() ||
                    (failure.metadataJson as Record<string, unknown> | null)?.code?.toString() ||
                    "Sem detalhe textual."}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
                  {(failure.metadataJson as Record<string, unknown> | null)?.stage ? (
                    <span>Etapa: {(failure.metadataJson as Record<string, unknown>).stage?.toString()}</span>
                  ) : null}
                  {(failure.metadataJson as Record<string, unknown> | null)?.source ? (
                    <span>Origem: {(failure.metadataJson as Record<string, unknown>).source?.toString()}</span>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        ) : (
          <section className="glass rounded-[2rem] p-6 text-sm text-muted">
            Nenhuma falha recente registrada.
          </section>
        )}
      </section>
    </div>
  );
}

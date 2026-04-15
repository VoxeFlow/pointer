"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { getImageConsentText, getOperationalConsentSections } from "@/lib/consent";

export function DeviceConsentSettingsForm({
  consentActive,
  consentAcceptedAt,
  imageConsentActive,
  imageConsentAcceptedAt,
}: {
  consentActive: boolean;
  consentAcceptedAt: string | null;
  imageConsentActive: boolean;
  imageConsentAcceptedAt: string | null;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"device" | "image" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function updateConsent({
    endpoint,
    accepted,
    kind,
  }: {
    endpoint: string;
    accepted: boolean;
    kind: "device" | "image";
  }) {
    setPendingAction(kind);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ accepted }),
      });

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(body.error ?? "Nao foi possivel atualizar o termo.");
        return;
      }

      setSuccess(
        kind === "device"
          ? accepted
            ? "Termo operacional confirmado com sucesso."
            : "Termo operacional revogado com sucesso."
          : accepted
            ? "Autorizacao de imagem confirmada com sucesso."
            : "Autorizacao de imagem revogada com sucesso.",
      );
      router.refresh();
    } catch {
      setError("Nao foi possivel atualizar o termo.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className="glass rounded-[2rem] p-5">
      <h2 className="text-lg font-semibold">Termos e consentimentos</h2>
      <p className="mt-2 text-sm text-muted">
        Aqui você pode revisar os textos vigentes do Pointer, acompanhar seu histórico de aceite e revogar autorizações
        quando permitido.
      </p>

      <div className="mt-4 grid gap-4">
        <article className="rounded-[1.5rem] border border-border bg-white/80 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Termo de ciência e uso do sistema</p>
              <p className={`mt-1 text-sm ${consentActive ? "text-emerald-700" : "text-amber-700"}`}>
                {consentActive ? "Aceite ativo" : "Sem aceite ativo"}
              </p>
              {consentAcceptedAt ? (
                <p className="mt-1 text-xs text-muted">
                  Última concordância:{" "}
                  {new Date(consentAcceptedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              disabled={pendingAction === "device"}
              onClick={() =>
                updateConsent({
                  endpoint: "/api/employee/device-consent",
                  accepted: !consentActive,
                  kind: "device",
                })
              }
              className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${
                consentActive
                  ? "border border-danger/30 bg-danger/5 text-danger hover:bg-danger/10"
                  : "bg-brand text-white hover:bg-brand-strong"
              }`}
            >
              {pendingAction === "device"
                ? "Atualizando..."
                : consentActive
                  ? "Revogar termo operacional"
                  : "Concordo com o termo operacional"}
            </button>
          </div>

          <div className="mt-4 max-h-[24rem] overflow-y-auto rounded-[1.25rem] border border-border bg-[#faf8f4] p-4">
            <div className="grid gap-4 text-sm leading-relaxed text-foreground">
              {getOperationalConsentSections().map((section) => (
                <div key={section.title}>
                  <p className="font-semibold">{section.title}</p>
                  <ul className="mt-2 grid gap-2 text-muted-foreground">
                    {section.items.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-border bg-white/80 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Autorização opcional de uso de imagem</p>
              <p className={`mt-1 text-sm ${imageConsentActive ? "text-emerald-700" : "text-muted"}`}>
                {imageConsentActive ? "Autorização ativa" : "Não autorizada"}
              </p>
              {imageConsentAcceptedAt ? (
                <p className="mt-1 text-xs text-muted">
                  Última autorização:{" "}
                  {new Date(imageConsentAcceptedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              disabled={pendingAction === "image"}
              onClick={() =>
                updateConsent({
                  endpoint: "/api/employee/image-consent",
                  accepted: !imageConsentActive,
                  kind: "image",
                })
              }
              className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${
                imageConsentActive
                  ? "border border-danger/30 bg-danger/5 text-danger hover:bg-danger/10"
                  : "bg-brand text-white hover:bg-brand-strong"
              }`}
            >
              {pendingAction === "image"
                ? "Atualizando..."
                : imageConsentActive
                  ? "Revogar uso de imagem"
                  : "Autorizar uso de imagem"}
            </button>
          </div>

          <div className="mt-4 rounded-[1.25rem] border border-border bg-[#faf8f4] p-4">
            <ul className="grid gap-2 text-sm leading-relaxed text-muted-foreground">
              {getImageConsentText().map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </article>
      </div>

      {error ? <p className="mt-4 rounded-[1rem] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
      {success ? <p className="mt-4 rounded-[1rem] bg-brand/10 px-4 py-3 text-sm text-brand">{success}</p> : null}
    </section>
  );
}

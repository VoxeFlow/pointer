"use client";

import { OrganizationPlan } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { planDescriptions, planHighlights, planLabels } from "@/lib/plan";

export function UpgradeRequestForm({
  currentPlan,
  latestRequestStatus,
}: {
  currentPlan: OrganizationPlan;
  latestRequestStatus?: string | null;
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

    const response = await fetch("/api/admin/upgrade-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(body.error ?? "Nao foi possivel registrar a solicitacao.");
      return;
    }

    router.refresh();
    (event.currentTarget as HTMLFormElement).reset();
  }

  return (
    <section className="glass mt-4 rounded-[2rem] p-5">
      <h2 className="text-lg font-semibold">Upgrade e expansao comercial</h2>
      <p className="mt-2 text-sm text-muted">
        Compare os planos do Pointer e registre uma solicitacao comercial sem depender de billing integrado agora.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {Object.values(OrganizationPlan).map((plan) => (
          <article
            key={plan}
            className={`rounded-[1.5rem] border p-4 ${
              currentPlan === plan
                ? "border-brand bg-brand text-white"
                : "border-border/80 bg-white/80"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">{planLabels[plan]}</h3>
              {currentPlan === plan ? (
                <span className="rounded-full bg-highlight px-3 py-1 text-xs font-semibold text-brand">Atual</span>
              ) : null}
            </div>
            <p className={`mt-2 text-sm ${currentPlan === plan ? "text-white/80" : "text-muted"}`}>{planDescriptions[plan]}</p>
            <div className="mt-4 grid gap-2 text-sm">
              {planHighlights[plan].map((highlight) => (
                <p key={highlight}>{highlight}</p>
              ))}
            </div>
          </article>
        ))}
      </div>

      <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
          <label className="grid gap-2">
            <span className="text-sm font-semibold">Plano desejado</span>
            <select name="desiredPlan" defaultValue={currentPlan} className="rounded-[1rem] border border-border bg-white/85 px-4 py-3">
              {Object.values(OrganizationPlan).map((plan) => (
                <option key={plan} value={plan} disabled={plan === currentPlan}>
                  {planLabels[plan]}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Contexto comercial opcional</span>
            <textarea
              name="message"
              rows={4}
              placeholder="Ex.: precisamos aumentar a capacidade para 80 funcionarios ainda este mes."
              className="rounded-[1rem] border border-border bg-white/85 px-4 py-3"
            />
          </label>
        </div>

        {latestRequestStatus ? (
          <p className="rounded-[1rem] bg-highlight/14 px-4 py-3 text-sm text-foreground">
            Ultima solicitacao registrada: <span className="font-semibold">{latestRequestStatus}</span>
          </p>
        ) : null}

        {error ? <p className="rounded-[1rem] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-[1rem] bg-brand px-4 py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
        >
          {pending ? "Enviando..." : "Solicitar contato comercial"}
        </button>
      </form>
    </section>
  );
}

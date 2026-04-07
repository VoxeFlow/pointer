"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  href?: string;
};

export function OnboardingChecklist({
  items,
  completedAt,
}: {
  items: ChecklistItem[];
  completedAt: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allDone = items.every((item) => item.done);

  async function handleComplete() {
    setPending(true);
    setError(null);

    const response = await fetch("/api/admin/onboarding/complete", {
      method: "POST",
    });

    const body = (await response.json()) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(body.error ?? "Nao foi possivel concluir o onboarding.");
      return;
    }

    router.refresh();
  }

  return (
    <section className="glass rounded-[2rem] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(249,246,241,0.9))] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-highlight">Ativacao inicial</p>
          <h2 className="mt-2 text-2xl font-semibold">Checklist do primeiro setup</h2>
          <p className="mt-2 text-sm text-muted">
            O Pointer usa este checklist para ajudar novos clientes a sair do trial com configuracao minima pronta.
          </p>
        </div>
        {completedAt ? (
          <div className="rounded-full bg-success/10 px-3 py-2 text-xs font-semibold text-success">
            Concluido em {new Date(completedAt).toLocaleDateString("pt-BR")}
          </div>
        ) : (
          <div className="rounded-full bg-highlight/16 px-3 py-2 text-xs font-semibold text-brand">
            Em andamento
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-[1.25rem] border border-border/80 bg-white p-4 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {item.done ? (
                  <CheckCircle2 className="size-5 text-success" />
                ) : (
                  <Circle className="size-5 text-muted" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{item.title}</p>
                  {item.done ? (
                    <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                      Ok
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted">{item.description}</p>
                {item.href ? (
                  <Link href={item.href} className="mt-3 inline-flex text-sm font-semibold text-brand">
                    Abrir etapa
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!completedAt ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleComplete}
            disabled={!allDone || pending}
            className="inline-flex items-center gap-2 rounded-[1.1rem] bg-brand px-4 py-3 font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Sparkles className="size-4" />
            {pending ? "Concluindo..." : "Marcar onboarding como concluido"}
          </button>
          {!allDone ? <p className="text-sm text-muted">Conclua os itens acima para liberar esta marcacao.</p> : null}
        </div>
      ) : null}

      {error ? <p className="mt-4 rounded-[1rem] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
    </section>
  );
}

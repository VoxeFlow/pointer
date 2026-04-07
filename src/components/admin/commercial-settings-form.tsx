"use client";

import { OrganizationPlan, OrganizationStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CommercialSettingsForm({
  status,
  plan,
  maxEmployees,
}: {
  status: OrganizationStatus;
  plan: OrganizationPlan;
  maxEmployees: number;
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

    const response = await fetch("/api/admin/settings/commercial", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(body.error ?? "Nao foi possivel salvar plano e capacidade.");
      return;
    }

    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Status</span>
          <select name="status" defaultValue={status} className="rounded-[1rem] border border-border bg-white/85 px-4 py-3">
            {Object.values(OrganizationStatus).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold">Plano</span>
          <select name="plan" defaultValue={plan} className="rounded-[1rem] border border-border bg-white/85 px-4 py-3">
            {Object.values(OrganizationPlan).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold">Capacidade</span>
          <input
            name="maxEmployees"
            type="number"
            min="1"
            defaultValue={maxEmployees}
            className="rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
      </div>

      {error ? <p className="rounded-[1rem] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[1rem] bg-brand px-4 py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar plano e capacidade"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as { error?: string; redirectTo?: string };
    setPending(false);

    if (!response.ok) {
      setError(body.error ?? "Nao foi possivel iniciar seu trial.");
      return;
    }

    router.replace(body.redirectTo ?? "/admin");
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Empresa</span>
          <input name="organizationName" required className="rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Razao social opcional</span>
          <input name="legalName" className="rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Documento opcional</span>
          <input name="documentNumber" className="rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Tamanho estimado da equipe</span>
          <input
            name="employeeEstimate"
            type="number"
            min="1"
            max="1000"
            defaultValue="15"
            required
            className="rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Seu nome</span>
          <input name="adminName" required className="rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Seu e-mail</span>
          <input name="adminEmail" type="email" required className="rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold">Senha inicial</span>
        <input name="password" type="password" required className="rounded-[1rem] border border-border bg-white/85 px-4 py-3" />
      </label>

      {error ? <p className="rounded-[1rem] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[1.2rem] bg-brand px-4 py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? "Criando ambiente..." : "Comecar trial do Pointer"}
      </button>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AccountantCreateForm() {
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
      const response = await fetch("/api/admin/accountants", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(body.error ?? "Nao foi possivel criar o perfil de contador.");
        return;
      }

      setSuccess("Perfil de contador criado com sucesso.");
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setError("Nao foi possivel criar o perfil de contador.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Nome</span>
          <input
            name="name"
            required
            placeholder="Nome do contador"
            className="rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold">E-mail</span>
          <input
            type="email"
            name="email"
            required
            placeholder="contador@empresa.com"
            className="rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Senha inicial</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="Senha provisoria"
            className="rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
      </div>

      {error ? <p className="rounded-[1rem] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
      {success ? <p className="rounded-[1rem] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[1rem] bg-brand px-4 py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? "Criando..." : "Criar acesso de contador"}
      </button>
    </form>
  );
}

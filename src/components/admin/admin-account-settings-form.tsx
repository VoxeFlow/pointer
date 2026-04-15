"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminAccountSettingsForm({
  email,
}: {
  email: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch("/api/admin/account", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(body.error ?? "Nao foi possivel atualizar o acesso do admin.");
      return;
    }

    event.currentTarget.reset();
    const emailInput = event.currentTarget.elements.namedItem("email") as HTMLInputElement | null;
    if (emailInput) {
      emailInput.value = String(payload.email ?? "");
    }

    setSuccess("Acesso atualizado com sucesso.");
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2">
        <span className="text-sm font-semibold">E-mail de login do admin</span>
        <input
          type="email"
          name="email"
          defaultValue={email}
          placeholder="contato@empresa.com"
          autoComplete="email"
          className="rounded-[1rem] border border-border bg-white/80 px-4 py-3"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold">Senha atual</span>
        <input
          type="password"
          name="currentPassword"
          required
          autoComplete="current-password"
          className="rounded-[1rem] border border-border bg-white/80 px-4 py-3"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Nova senha</span>
          <input
            type="password"
            name="newPassword"
            autoComplete="new-password"
            className="rounded-[1rem] border border-border bg-white/80 px-4 py-3"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold">Confirmar nova senha</span>
          <input
            type="password"
            name="confirmNewPassword"
            autoComplete="new-password"
            className="rounded-[1rem] border border-border bg-white/80 px-4 py-3"
          />
        </label>
      </div>

      <p className="text-xs text-muted">
        Se quiser trocar apenas o e-mail, informe sua senha atual e deixe os campos de nova senha em branco.
      </p>

      {error ? <p className="rounded-[1rem] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
      {success ? <p className="rounded-[1rem] bg-brand/10 px-4 py-3 text-sm text-brand">{success}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[1rem] bg-brand px-4 py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? "Atualizando acesso..." : "Salvar acesso do admin"}
      </button>
    </form>
  );
}

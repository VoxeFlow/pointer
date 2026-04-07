"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BrandingSettingsForm({
  brandDisplayName,
  brandLogoUrl,
  brandPrimaryColor,
  brandAccentColor,
}: {
  brandDisplayName: string | null;
  brandLogoUrl: string | null;
  brandPrimaryColor: string | null;
  brandAccentColor: string | null;
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

    const response = await fetch("/api/admin/settings/branding", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(body.error ?? "Nao foi possivel salvar o branding.");
      return;
    }

    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Nome visual</span>
          <input
            name="brandDisplayName"
            defaultValue={brandDisplayName ?? ""}
            placeholder="Ex.: Pointer ACME"
            className="rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold">URL da logo</span>
          <input
            name="brandLogoUrl"
            defaultValue={brandLogoUrl ?? ""}
            placeholder="https://..."
            className="rounded-[1rem] border border-border bg-white/85 px-4 py-3"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Cor principal</span>
          <div className="flex items-center gap-3 rounded-[1rem] border border-border bg-white/85 px-4 py-3">
            <input name="brandPrimaryColor" type="color" defaultValue={brandPrimaryColor ?? "#171717"} className="size-9 rounded border-0 bg-transparent p-0" />
            <input
              name="brandPrimaryColor"
              defaultValue={brandPrimaryColor ?? "#171717"}
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </div>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Cor de destaque</span>
          <div className="flex items-center gap-3 rounded-[1rem] border border-border bg-white/85 px-4 py-3">
            <input name="brandAccentColor" type="color" defaultValue={brandAccentColor ?? "#d4ad5b"} className="size-9 rounded border-0 bg-transparent p-0" />
            <input
              name="brandAccentColor"
              defaultValue={brandAccentColor ?? "#d4ad5b"}
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </div>
        </label>
      </div>

      {error ? <p className="rounded-[1rem] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[1rem] bg-brand px-4 py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar identidade da organizacao"}
      </button>
    </form>
  );
}

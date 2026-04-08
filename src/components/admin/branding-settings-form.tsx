"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { UploadCloud, Loader2, CheckCircle2 } from "lucide-react";

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

  const [logoUrl, setLogoUrl] = useState<string | null>(brandLogoUrl);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingLogo(true);
      setError(null);
      
      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch("/api/admin/settings/branding/logo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
         throw new Error(data.error || "Falha ao enviar a logo.");
      }

      setLogoUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no envio da logo.");
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

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
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-muted-foreground">Nome visual</span>
          <input
            name="brandDisplayName"
            defaultValue={brandDisplayName ?? ""}
            placeholder="Ex.: Pointer ACME"
            className="rounded-2xl border border-border bg-white/85 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition"
          />
        </label>
        
        <div className="grid gap-2">
          <span className="text-sm font-semibold text-muted-foreground">Logo da Empresa</span>
          <div className="relative flex items-center justify-between rounded-2xl border border-border bg-white/85 px-4 py-2 transition hover:bg-white text-sm">
             <input type="hidden" name="brandLogoUrl" value={logoUrl ?? ""} />
             <input 
               type="file" 
               accept="image/png, image/jpeg, image/webp, image/svg+xml" 
               className="hidden" 
               ref={fileInputRef}
               onChange={handleLogoUpload}
             />
             
             <div className="flex items-center gap-3 overflow-hidden">
                {logoUrl ? (
                   <img src={logoUrl} alt="Logo" className="h-8 max-w-[100px] object-contain rounded-md" />
                ) : (
                   <div className="h-8 flex items-center text-muted-foreground/50 text-xs italic">Nenhuma logo</div>
                )}
             </div>

             <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo || pending}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-slate-200 transition disabled:opacity-50"
             >
                {isUploadingLogo ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />}
                {isUploadingLogo ? "Enviando..." : "Alterar Logo"}
             </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-muted-foreground">Cor principal</span>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-white/85 px-4 py-3 focus-within:ring-2 focus-within:ring-brand/50 transition">
            <input name="brandPrimaryColor" type="color" defaultValue={brandPrimaryColor ?? "#171717"} className="size-8 rounded border-0 bg-transparent p-0 cursor-pointer" />
            <input
              name="brandPrimaryColor"
              defaultValue={brandPrimaryColor ?? "#171717"}
              className="min-w-0 flex-1 bg-transparent outline-none text-sm font-medium"
            />
          </div>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-muted-foreground">Cor de destaque</span>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-white/85 px-4 py-3 focus-within:ring-2 focus-within:ring-brand/50 transition">
            <input name="brandAccentColor" type="color" defaultValue={brandAccentColor ?? "#d4ad5b"} className="size-8 rounded border-0 bg-transparent p-0 cursor-pointer" />
            <input
              name="brandAccentColor"
              defaultValue={brandAccentColor ?? "#d4ad5b"}
              className="min-w-0 flex-1 bg-transparent outline-none text-sm font-medium"
            />
          </div>
        </label>
      </div>

      {error ? <p className="rounded-[1rem] bg-red-50 px-4 py-3 text-sm font-medium text-red-600 ring-1 ring-red-100">{error}</p> : null}

      <div className="pt-2">
        <button
          type="submit"
          disabled={pending || isUploadingLogo}
          className="flex items-center gap-2 rounded-2xl bg-[#171717] px-6 py-4 font-bold text-white transition hover:bg-black active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
          Salvar identidade da organizacao
        </button>
      </div>
    </form>
  );
}

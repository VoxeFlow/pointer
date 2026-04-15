"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PayslipStatusAction({ payslipId, status }: { payslipId: string; status: "DRAFT" | "PUBLISHED" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "PUBLISHED") {
    return <p className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm font-semibold text-emerald-700">Publicado</p>;
  }

  async function publishPayslip() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/payslips/${payslipId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Não foi possível liberar o contracheque.");
        return;
      }
      router.refresh();
    } catch {
      setError("Não foi possível liberar o contracheque.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={publishPayslip}
        disabled={pending}
        className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold transition hover:bg-muted/30 disabled:opacity-60"
      >
        {pending ? "Liberando..." : "Liberar contracheque"}
      </button>
      {error ? <p className="max-w-72 rounded-[0.75rem] bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

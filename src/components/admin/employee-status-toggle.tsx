"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EmployeeStatusToggle({
  employeeId,
  isActive,
}: {
  employeeId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await fetch(`/api/admin/employees/${employeeId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        toggleStatusOnly: true,
      }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-full border border-border bg-white/80 px-4 py-2 text-sm font-semibold"
    >
      {pending ? "Atualizando..." : isActive ? "Desativar" : "Reativar"}
    </button>
  );
}

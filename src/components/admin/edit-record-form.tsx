"use client";

import { useActionState } from "react";

import { updateRecordTimestampAction } from "@/app/(app)/admin/employees/actions";

type EditRecordFormProps = {
  employeeId: string;
  recordId: string;
  defaultDate: string;
  defaultTime: string;
  isManual?: boolean;
};

export function EditRecordForm({ employeeId, recordId, defaultDate, defaultTime, isManual = false }: EditRecordFormProps) {
  const [, formAction, isPending] = useActionState(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_prevState: any, formData: FormData) => updateRecordTimestampAction(employeeId, recordId, _prevState, formData),
    null,
  );

  return (
    <details className="mt-4 rounded-[1rem] border border-black/5 bg-white/70 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-brand">
        {isManual ? "Corrigir este ajuste auditado" : "Criar ajuste auditado deste registro"}
      </summary>

      <p className="mt-3 text-sm text-muted">
        {isManual
          ? "O Pointer vai preservar este ajuste atual, desconsiderá-lo e criar um novo ajuste auditado com o horário correto."
          : "O Pointer preserva a marcação original e cria uma nova marcação manual auditada, com motivo obrigatório."}
      </p>

      <form action={formAction} className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor={`date-${recordId}`} className="text-sm font-medium">
              Data
            </label>
            <input
              type="date"
              name="date"
              id={`date-${recordId}`}
              defaultValue={defaultDate}
              required
              className="w-full rounded-[1rem] border-none bg-white px-4 py-3 focus:ring-2 focus:ring-brand"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor={`time-${recordId}`} className="text-sm font-medium">
              Hora
            </label>
            <input
              type="time"
              name="time"
              id={`time-${recordId}`}
              defaultValue={defaultTime}
              required
              className="w-full rounded-[1rem] border-none bg-white px-4 py-3 focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor={`reason-${recordId}`} className="text-sm font-medium">
            Motivo do ajuste
          </label>
          <textarea
            name="reason"
            id={`reason-${recordId}`}
            required
            placeholder="Ex: colaborador relatou falha de rede às 09:00 e o ajuste foi validado pelo admin."
            className="h-24 w-full rounded-[1rem] border-none bg-white px-4 py-3 focus:ring-2 focus:ring-brand"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-[1rem] bg-brand py-3 font-semibold text-white transition-all hover:bg-brand/90 disabled:opacity-50"
        >
          {isPending ? "Criando ajuste..." : isManual ? "Criar novo ajuste auditado" : "Criar ajuste auditado"}
        </button>
      </form>
    </details>
  );
}

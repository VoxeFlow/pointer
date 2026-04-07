"use client";

import { useActionState } from "react";
import { RecordType } from "@prisma/client";

import { createManualRecordAction } from "@/app/(app)/admin/employees/actions";

type ManualRecordFormProps = {
  employeeId: string;
};

const recordTypes = [
  { value: RecordType.ENTRY, label: "Entrada" },
  { value: RecordType.BREAK_OUT, label: "Saída Almoço" },
  { value: RecordType.BREAK_IN, label: "Retorno Almoço" },
  { value: RecordType.EXIT, label: "Saída" },
];

export function ManualRecordForm({ employeeId }: ManualRecordFormProps) {
  const [, formAction, isPending] = useActionState(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_prevState: any, formData: FormData) => createManualRecordAction(employeeId, _prevState, formData),
    null
  );

  const today = new Date().toISOString().split("T")[0];

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="date" className="text-sm font-medium">Data</label>
          <input
            type="date"
            name="date"
            id="date"
            defaultValue={today}
            required
            className="w-full rounded-[1rem] border-none bg-white/50 px-4 py-3 focus:ring-2 focus:ring-brand"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="time" className="text-sm font-medium">Hora</label>
          <input
            type="time"
            name="time"
            id="time"
            required
            className="w-full rounded-[1rem] border-none bg-white/50 px-4 py-3 focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="type" className="text-sm font-medium">Tipo de Registro</label>
        <select
          name="type"
          id="type"
          required
          className="w-full rounded-[1rem] border-none bg-white/50 px-4 py-3 focus:ring-2 focus:ring-brand"
        >
          <option value="">Selecione o tipo...</option>
          {recordTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="reason" className="text-sm font-medium">Motivo do Ajuste</label>
        <textarea
          name="reason"
          id="reason"
          required
          placeholder="Ex: Funcionario esqueceu de bater o ponto na entrada."
          className="h-24 w-full rounded-[1rem] border-none bg-white/50 px-4 py-3 focus:ring-2 focus:ring-brand"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-[1rem] bg-brand py-3 font-semibold text-white transition-all hover:bg-brand/90 disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Salvar Registro Manual"}
      </button>
    </form>
  );
}

import type { ReactNode } from "react";

import { FormSubmitButton } from "@/components/admin/form-submit-button";
import { WeeklyScheduleEditor } from "@/components/admin/weekly-schedule-editor";

type EmployeeFormProps = {
  mode: "create" | "edit";
  action: (formData: FormData) => void | Promise<void>;
  employee?: {
    name: string;
    email: string;
    employeeCode: string | null;
    isActive: boolean;
    schedule: {
      lateToleranceMinutes: number;
      weekdays?: {
        weekday: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
        isWorkingDay: boolean;
        startTime: string | null;
        endTime: string | null;
        breakMinMinutes: number;
        dailyWorkloadMinutes: number;
      }[];
    } | null;
  };
  defaults: {
    lateToleranceMinutes: number;
    weekdays: {
      weekday: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
      isWorkingDay: boolean;
      startTime: string | null;
      endTime: string | null;
      breakMinMinutes: number;
      dailyWorkloadMinutes: number;
    }[];
  };
  feedback?: ReactNode;
};

export function EmployeeForm({ mode, action, employee, defaults, feedback }: EmployeeFormProps) {
  const schedule = employee?.schedule ?? defaults;

  return (
    <form className="grid gap-4" action={action}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Nome</span>
          <input
            name="name"
            defaultValue={employee?.name ?? ""}
            required
            className="rounded-[1rem] border border-border bg-white/80 px-4 py-3"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold">E-mail</span>
          <input
            name="email"
            type="email"
            defaultValue={employee?.email ?? ""}
            required
            className="rounded-[1rem] border border-border bg-white/80 px-4 py-3"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Codigo do funcionario</span>
          <input
            name="employeeCode"
            defaultValue={employee?.employeeCode ?? ""}
            className="rounded-[1rem] border border-border bg-white/80 px-4 py-3"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold">{mode === "create" ? "Senha provisoria" : "Nova senha provisoria"}</span>
          <input
            name="password"
            type="password"
            required={mode === "create"}
            className="rounded-[1rem] border border-border bg-white/80 px-4 py-3"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:max-w-xs">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Tolerância de atraso</span>
          <input
            name="lateToleranceMinutes"
            type="number"
            min="0"
            defaultValue={schedule.lateToleranceMinutes}
            required
            className="rounded-[1rem] border border-border bg-white/80 px-4 py-3"
          />
        </label>
      </div>

      <WeeklyScheduleEditor defaults={schedule.weekdays ?? defaults.weekdays} />

      {mode === "edit" ? (
        <label className="flex items-center gap-3 rounded-[1rem] border border-border bg-white/70 px-4 py-3">
          <input type="checkbox" name="isActive" defaultChecked={employee?.isActive} />
          <span className="text-sm font-semibold">Funcionario ativo</span>
        </label>
      ) : null}

      {feedback}

      <FormSubmitButton
        idleLabel={mode === "create" ? "Cadastrar funcionario" : "Salvar alteracoes"}
        pendingLabel={mode === "create" ? "Cadastrando funcionario..." : "Salvando alteracoes..."}
      />
    </form>
  );
}

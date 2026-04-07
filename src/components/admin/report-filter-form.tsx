"use client";

import { useState } from "react";
import { Download, Calendar, User as UserIcon } from "lucide-react";

type Employee = {
  id: string;
  name: string;
};

interface ReportFilterFormProps {
  employees: Employee[];
}

export function ReportFilterForm({ employees }: ReportFilterFormProps) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  const downloadUrl = () => {
    const params = new URLSearchParams();
    if (fromDate) params.append("from", fromDate);
    if (toDate) params.append("to", toDate);
    if (selectedUser) params.append("userId", selectedUser);
    
    return `/api/reports/time-records?${params.toString()}`;
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Calendar className="size-3" />
            Data Inicial
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Calendar className="size-3" />
            Data Final
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <UserIcon className="size-3" />
            Funcionário
          </label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-border bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-all"
          >
            <option value="">Todos os funcionários</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <a
        href={downloadUrl()}
        className="flex items-center justify-center gap-3 rounded-2xl bg-brand px-6 py-5 font-bold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-strong hover:-translate-y-0.5 active:translate-y-0"
      >
        <Download className="size-5" />
        Gerar e Baixar Relatório CSV
      </a>

      <p className="text-center text-xs text-muted-foreground">
        O arquivo será gerado instantaneamente com base nos critérios acima.
      </p>
    </div>
  );
}

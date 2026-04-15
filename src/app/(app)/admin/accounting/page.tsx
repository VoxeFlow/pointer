import Link from "next/link";

import { PayslipBatchGeneratorForm } from "@/components/admin/payslip-batch-generator-form";
import { PayslipUploadForm } from "@/components/admin/payslip-upload-form";
import { AccountantCreateForm } from "@/components/admin/accountant-create-form";
import { PayrollProfileForm } from "@/components/admin/payroll-profile-form";
import { MedicalCertificateReviewForm } from "@/components/admin/medical-certificate-review-form";
import { PayslipStatusAction } from "@/components/admin/payslip-status-action";
import { requireRoles } from "@/lib/auth/guards";
import { db } from "@/lib/db";

type AccountingSection =
  | "acesso-contador"
  | "publicar-contracheque"
  | "atestados"
  | "perfil-financeiro"
  | "contracheques-publicados";

type AccountingPageProps = {
  searchParams?: Promise<{
    section?: string;
    month?: string;
    year?: string;
    status?: string;
    employeeId?: string;
    quickCompetence?: string;
  }>;
};

const sections: Array<{ id: AccountingSection; label: string }> = [
  { id: "acesso-contador", label: "Acesso contador" },
  { id: "publicar-contracheque", label: "Publicar contracheque" },
  { id: "atestados", label: "Atestados" },
  { id: "perfil-financeiro", label: "Perfil financeiro" },
  { id: "contracheques-publicados", label: "Contracheques gerados" },
];

function parseSection(value?: string): AccountingSection {
  if (sections.some((item) => item.id === value)) {
    return value as AccountingSection;
  }
  return "publicar-contracheque";
}

function parseMonth(value?: string) {
  const month = Number(value);
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return month;
}

function parseYear(value?: string) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2024 || year > 2100) return null;
  return year;
}

function parsePayslipStatus(value?: string) {
  if (value === "DRAFT" || value === "PUBLISHED") return value;
  return "ALL" as const;
}

function parseQuickCompetence(value?: string) {
  if (value === "current" || value === "previous" || value === "custom") return value;
  return "custom" as const;
}

export default async function AdminAccountingPage({ searchParams }: AccountingPageProps) {
  const session = await requireRoles(["ADMIN", "ACCOUNTANT"]);
  const params = await searchParams;
  const resolvedSection = parseSection(params?.section);
  const filteredMonth = parseMonth(params?.month);
  const filteredYear = parseYear(params?.year);
  const filteredStatus = parsePayslipStatus(params?.status);
  const quickCompetence = parseQuickCompetence(params?.quickCompetence);
  const payslipWhere: {
    organizationId: string;
    competenceMonth?: number;
    competenceYear?: number;
    status?: "DRAFT" | "PUBLISHED";
    userId?: string;
  } = { organizationId: session.organizationId };

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const effectiveMonth =
    filteredMonth ?? (quickCompetence === "current" ? currentMonth : quickCompetence === "previous" ? previousMonth : null);
  const effectiveYear =
    filteredYear ?? (quickCompetence === "current" ? currentYear : quickCompetence === "previous" ? previousYear : null);
  const filteredEmployeeId = params?.employeeId?.trim() ? params.employeeId.trim() : "";

  if (effectiveMonth) payslipWhere.competenceMonth = effectiveMonth;
  if (effectiveYear) payslipWhere.competenceYear = effectiveYear;
  if (filteredStatus !== "ALL") payslipWhere.status = filteredStatus;
  if (filteredEmployeeId) payslipWhere.userId = filteredEmployeeId;

  const [employees, accountants, certificates, payslips] = await Promise.all([
    db.user.findMany({
      where: { organizationId: session.organizationId, role: "EMPLOYEE", isActive: true },
      select: {
        id: true,
        name: true,
        payrollProfilePosition: true,
        payrollBaseSalary: true,
        payrollBenefitsAmount: true,
        payrollDiscountsAmount: true,
        payrollEarningsTemplateJson: true,
        payrollDeductionsTemplateJson: true,
      },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { organizationId: session.organizationId, role: "ACCOUNTANT" },
      select: { id: true, name: true, email: true, isActive: true },
      orderBy: { name: "asc" },
    }),
    db.medicalCertificate.findMany({
      where: { organizationId: session.organizationId },
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.payslip.findMany({
      where: payslipWhere,
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: [{ competenceYear: "desc" }, { competenceMonth: "desc" }, { createdAt: "desc" }],
      take: 20,
    }),
  ]);

  const normalizedEmployeeId = employees.some((employee) => employee.id === filteredEmployeeId) ? filteredEmployeeId : "";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5">
      <section className="glass rounded-[2rem] p-5">
        <h1 className="text-2xl font-semibold">Contador e folha</h1>
        <p className="mt-2 text-sm text-muted">
          Central de documentos para conferência da jornada, recebimento de atestados e publicação de contracheques digitais.
        </p>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {sections
            .filter((section) => (session.role === "ADMIN" ? true : section.id !== "acesso-contador"))
            .map((section) => {
              const isActive = resolvedSection === section.id;
              return (
                <Link
                  key={section.id}
                  href={`/admin/accounting?section=${section.id}`}
                  className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-highlight text-[#111111] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
                      : "border border-border bg-white/80 text-foreground hover:bg-muted/30"
                  }`}
                >
                  {section.label}
                </Link>
              );
            })}
        </div>
      </section>

      {session.role === "ADMIN" && resolvedSection === "acesso-contador" ? (
        <section className="glass rounded-[2rem] p-5">
          <h2 className="text-lg font-semibold">Acesso de contador</h2>
          <p className="mt-2 text-sm text-muted">
            Crie um perfil dedicado para o contador sem compartilhar o login principal de administração.
          </p>
          <div className="mt-5">
            <AccountantCreateForm />
          </div>
          <div className="mt-5 grid gap-2">
            {accountants.length === 0 ? (
              <p className="rounded-[1rem] border border-border bg-white/70 px-4 py-4 text-sm text-muted">
                Nenhum contador cadastrado ainda.
              </p>
            ) : (
              accountants.map((accountant) => (
                <article key={accountant.id} className="rounded-[1rem] border border-border bg-white/80 px-4 py-3">
                  <p className="font-semibold">{accountant.name}</p>
                  <p className="text-sm text-muted">{accountant.email}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {accountant.isActive ? "Ativo" : "Inativo"}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      {resolvedSection === "publicar-contracheque" ? (
        <section className="glass rounded-[2rem] p-5">
          <h2 className="text-lg font-semibold">Publicar contracheque</h2>
          <p className="mt-2 text-sm text-muted">
            Fluxo recomendado: 1) gerar rascunho em lote, 2) abrir em &quot;Contracheques gerados&quot;, 3) revisar e editar na prévia, 4) liberar.
          </p>
          <div className="mt-5 grid gap-6">
            <PayslipBatchGeneratorForm />
            <PayslipUploadForm employees={employees} />
          </div>
        </section>
      ) : null}

      {resolvedSection === "atestados" ? (
        <section className="glass rounded-[2rem] p-5">
          <h2 className="text-lg font-semibold">Atestados recebidos</h2>
          <div className="mt-4 grid gap-3">
            {certificates.length === 0 ? (
              <p className="rounded-[1rem] border border-border bg-white/70 px-4 py-4 text-sm text-muted">
                Nenhum atestado recebido ainda.
              </p>
            ) : (
              certificates.map((certificate) => (
                <article key={certificate.id} className="rounded-[1.25rem] border border-border bg-white/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{certificate.user.name}</p>
                      <p className="mt-1 text-sm text-muted">
                        {certificate.status} • {certificate.originalFileName}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        Recebido em {certificate.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        Status:{" "}
                        <strong>
                          {certificate.status === "SUBMITTED"
                            ? "Enviado"
                            : certificate.status === "REVIEWED"
                            ? "Revisado"
                            : certificate.status === "ACCEPTED"
                            ? "Aceito"
                            : "Rejeitado"}
                        </strong>
                      </p>
                      {certificate.notes ? <p className="mt-2 text-sm text-muted">{certificate.notes}</p> : null}
                      {certificate.reviewNote ? (
                        <p className="mt-2 text-sm text-muted">
                          Comentário do contador: <strong>{certificate.reviewNote}</strong>
                        </p>
                      ) : null}
                    </div>
                    <div className="grid gap-2">
                      <Link href={certificate.fileUrl} target="_blank" className="rounded-full border border-border bg-white px-4 py-2 text-center text-sm font-semibold">
                        Abrir atestado
                      </Link>
                      <MedicalCertificateReviewForm certificateId={certificate.id} status={certificate.status} />
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      {resolvedSection === "perfil-financeiro" ? (
        <section className="glass rounded-[2rem] p-5">
          <h2 className="text-lg font-semibold">Perfil financeiro do funcionário</h2>
          <p className="mt-2 text-sm text-muted">
            Cadastre salário, benefícios e descontos padrão. O contracheque mensal pode ser gerado automaticamente com base nesse perfil.
          </p>
          <div className="mt-5">
            <PayrollProfileForm employees={employees} />
          </div>
        </section>
      ) : null}

      {resolvedSection === "contracheques-publicados" ? (
        <section className="glass rounded-[2rem] p-5">
          <h2 className="text-lg font-semibold">Contracheques gerados</h2>
          <p className="mt-2 text-sm text-muted">
            Aqui ficam os rascunhos e os publicados. Use <strong>Pré-visualizar</strong> antes de liberar para o funcionário.
          </p>
          <form className="mt-4 grid gap-3 rounded-[1rem] border border-border bg-white/80 p-4 md:grid-cols-6" method="get">
            <input type="hidden" name="section" value="contracheques-publicados" />
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-muted">Competência rápida</span>
              <select
                name="quickCompetence"
                defaultValue={quickCompetence}
                className="rounded-[0.9rem] border border-border bg-white px-3 py-2"
              >
                <option value="custom">Personalizado</option>
                <option value="current">Mês atual</option>
                <option value="previous">Mês anterior</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-muted">Mês</span>
              <input
                type="number"
                name="month"
                min="1"
                max="12"
                defaultValue={effectiveMonth ?? ""}
                placeholder="Todos"
                className="rounded-[0.9rem] border border-border bg-white px-3 py-2"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-muted">Ano</span>
              <input
                type="number"
                name="year"
                min="2024"
                max="2100"
                defaultValue={effectiveYear ?? ""}
                placeholder="Todos"
                className="rounded-[0.9rem] border border-border bg-white px-3 py-2"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-muted">Funcionário</span>
              <select
                name="employeeId"
                defaultValue={normalizedEmployeeId}
                className="rounded-[0.9rem] border border-border bg-white px-3 py-2"
              >
                <option value="">Todos</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="text-xs font-semibold text-muted">Status</span>
              <select
                name="status"
                defaultValue={filteredStatus}
                className="rounded-[0.9rem] border border-border bg-white px-3 py-2"
              >
                <option value="ALL">Todos</option>
                <option value="DRAFT">Rascunho</option>
                <option value="PUBLISHED">Publicado</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2 self-end md:col-span-6">
              <button
                type="submit"
                className="rounded-[0.9rem] bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
              >
                Aplicar
              </button>
              <Link
                href="/admin/accounting?section=contracheques-publicados"
                className="rounded-[0.9rem] border border-border bg-white px-3 py-2 text-center text-sm font-semibold"
              >
                Limpar
              </Link>
            </div>
          </form>
          <div className="mt-4 grid gap-3">
            {payslips.length === 0 ? (
              <p className="rounded-[1rem] border border-border bg-white/70 px-4 py-4 text-sm text-muted">
                Nenhum contracheque encontrado para os filtros selecionados.
              </p>
            ) : (
              payslips.map((payslip) => (
                <article key={payslip.id} className="rounded-[1.25rem] border border-border bg-white/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{payslip.user.name}</p>
                      <p className="mt-1 text-sm text-muted capitalize">{payslip.referenceLabel}</p>
                      <p className="mt-1 text-sm text-muted">
                        Status {payslip.status === "PUBLISHED" ? "Publicado" : "Rascunho"} •{" "}
                        {String(payslip.competenceMonth).padStart(2, "0")}/{payslip.competenceYear}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Link
                        href={`/admin/payslips/${payslip.id}`}
                        className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold"
                      >
                        Pré-visualizar
                      </Link>
                      {payslip.fileUrl ? (
                        <Link href={payslip.fileUrl} target="_blank" className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold">
                          Abrir contracheque
                        </Link>
                      ) : null}
                      <PayslipStatusAction payslipId={payslip.id} status={payslip.status} />
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

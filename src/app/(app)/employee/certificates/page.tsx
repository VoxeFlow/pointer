import Link from "next/link";

import { MedicalCertificateUploadForm } from "@/components/employee/medical-certificate-upload-form";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export default async function EmployeeCertificatesPage() {
  const session = await requireRole("EMPLOYEE");
  const certificates = await db.medicalCertificate.findMany({
    where: { organizationId: session.organizationId, userId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5">
      <section className="glass rounded-[2rem] p-5">
        <h1 className="text-2xl font-semibold">Atestados</h1>
        <p className="mt-2 text-sm text-muted">
          Envie atestados e documentos de saúde diretamente pelo Pointer. O acesso é restrito ao time autorizado da empresa.
        </p>
        <div className="mt-5">
          <MedicalCertificateUploadForm />
        </div>
      </section>

      <section className="glass rounded-[2rem] p-5">
        <h2 className="text-lg font-semibold">Histórico enviado</h2>
        <div className="mt-4 grid gap-3">
          {certificates.length === 0 ? (
            <p className="rounded-[1rem] border border-border bg-white/70 px-4 py-4 text-sm text-muted">
              Nenhum atestado enviado ainda.
            </p>
          ) : (
            certificates.map((certificate) => (
              <article key={certificate.id} className="rounded-[1.25rem] border border-border bg-white/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{certificate.originalFileName}</p>
                    <p className="mt-1 text-sm text-muted">
                      Status: {certificate.status} • enviado em{" "}
                      {certificate.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    </p>
                    {certificate.startDate ? (
                      <p className="mt-1 text-sm text-muted">
                        Período: {certificate.startDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                        {certificate.endDate
                          ? ` até ${certificate.endDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
                          : ""}
                      </p>
                    ) : null}
                    {certificate.notes ? <p className="mt-2 text-sm text-muted">{certificate.notes}</p> : null}
                  </div>
                  <Link
                    href={certificate.fileUrl}
                    target="_blank"
                    className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold"
                  >
                    Abrir arquivo
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

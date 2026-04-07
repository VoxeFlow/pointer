import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { TimeAdjustmentRequestForm } from "@/components/time-record/time-adjustment-request-form";

export default async function EmployeeAdjustmentsPage() {
  const session = await requireRole("EMPLOYEE");

  const requests = await db.timeAdjustmentRequest.findMany({
    where: {
      organizationId: session.organizationId,
      userId: session.sub,
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5">
      <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,#6a32df_0%,#4b1fb2_42%,#f4f1ec_42%,#f4f1ec_100%)] shadow-[0_28px_72px_rgba(38,14,92,0.24)]">
        <div className="px-5 pb-6 pt-6 text-white">
          <p className="text-sm text-white/80">Pointer</p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight">Acerto de ponto</h1>
          <p className="mt-2 max-w-xl text-sm text-white/78">
            Abra uma solicitação quando faltar uma marcação, houver horário incorreto ou você precisar justificar um ajuste.
          </p>
        </div>
        <div className="rounded-t-[2rem] bg-[#f4f1ec] px-5 pb-6 pt-5">
          <TimeAdjustmentRequestForm
            initialRequests={requests.map((request) => ({
              id: request.id,
              requestedDate: request.requestedDate.toISOString().slice(0, 10),
              requestedTime: request.requestedTime,
              requestedType: request.requestedType,
              status: request.status,
              reason: request.reason,
              reviewNote: request.reviewNote,
              createdAt: request.createdAt.toISOString(),
            }))}
          />
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { RecordType } from "@prisma/client";
import { ArrowRight, CheckCircle2, Camera } from "lucide-react";

import { recordTypeLabels } from "@/lib/constants";

export function PrimaryRecordCard({
  nextType,
  recordsCount,
}: {
  nextType: RecordType | null;
  recordsCount: number;
}) {
  const finished = recordsCount >= 4 || !nextType;

  return (
    <section
      className={`overflow-hidden rounded-[2.1rem] p-5 sm:p-6 ${
        finished
          ? "glass bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,241,235,0.9))]"
          : "bg-[radial-gradient(circle_at_12%_18%,rgba(212,173,91,0.34),transparent_12%),linear-gradient(165deg,#111111_0%,#181818_45%,#050505_100%)] text-white shadow-[0_28px_72px_rgba(0,0,0,0.18)]"
      }`}
    >
      <p className={`text-xs uppercase tracking-[0.28em] ${finished ? "text-brand" : "text-white/60"}`}>Batida do dia</p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
        {finished ? "Tudo certo por hoje" : "Bater ponto agora"}
      </h2>
      <p className={`mt-3 max-w-xl text-sm leading-7 ${finished ? "text-muted" : "text-white/78"}`}>
        {finished
          ? "Suas quatro marcações de hoje já foram concluídas. Se quiser, confira abaixo o resumo e os horários registrados."
          : `A próxima marcação esperada é ${recordTypeLabels[nextType]}. Abra a câmera, tire a foto e confirme.`}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className={`rounded-[1.3rem] px-4 py-4 ${finished ? "border border-border/70 bg-white/70" : "border border-white/10 bg-white/8"}`}>
          <p className={`text-xs uppercase tracking-[0.18em] ${finished ? "text-muted" : "text-white/55"}`}>Etapa</p>
          <p className="mt-2 text-lg font-semibold">{finished ? "Concluída" : recordTypeLabels[nextType!]}</p>
        </div>
        <div className={`rounded-[1.3rem] px-4 py-4 ${finished ? "border border-border/70 bg-white/70" : "border border-white/10 bg-white/8"}`}>
          <p className={`text-xs uppercase tracking-[0.18em] ${finished ? "text-muted" : "text-white/55"}`}>Registros hoje</p>
          <p className="mt-2 text-lg font-semibold">{recordsCount}/4</p>
        </div>
        <div className={`rounded-[1.3rem] px-4 py-4 ${finished ? "border border-border/70 bg-white/70" : "border border-white/10 bg-white/8"}`}>
          <p className={`text-xs uppercase tracking-[0.18em] ${finished ? "text-muted" : "text-white/55"}`}>Como funciona</p>
          <p className="mt-2 text-lg font-semibold">{finished ? "Resumo do dia" : "Foto + localização"}</p>
        </div>
      </div>

      <Link
        href="/employee/record"
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[1.5rem] px-4 py-5 text-lg font-semibold transition ${
          finished
            ? "border border-border bg-white text-foreground hover:bg-[#fbfaf8]"
            : "bg-highlight text-brand hover:opacity-95"
        }`}
      >
        {finished ? <CheckCircle2 className="size-5" /> : <Camera className="size-5" />}
        {finished ? "Conferir resumo do dia" : "Abrir câmera e bater ponto"}
        {!finished ? <ArrowRight className="size-5" /> : null}
      </Link>
    </section>
  );
}

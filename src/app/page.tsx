import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPinned,
  Shield,
  Smartphone,
  TimerReset,
  Users2,
} from "lucide-react";

import { BrandMark } from "@/components/ui/brand-mark";
import { getSession } from "@/lib/auth/session";

export default async function IndexPage() {
  const session = await getSession();

  if (session) {
    if (session.mustChangePassword) {
      redirect(`/t/${session.organizationSlug}/first-access`);
    }

    redirect(session.role === "ADMIN" ? "/admin" : "/employee");
  }

  return (
    <main className="safe-top px-4 py-6 sm:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2.2rem] bg-[radial-gradient(circle_at_10%_18%,rgba(212,173,91,0.34),transparent_12%),radial-gradient(circle_at_92%_18%,rgba(255,255,255,0.08),transparent_18%),linear-gradient(160deg,#111111_0%,#181818_45%,#050505_100%)] p-6 text-white shadow-[0_28px_80px_rgba(0,0,0,0.22)] sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <BrandMark href="/" mode="full" theme="light" priority />
              <div className="mt-6 inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/72">
                Ponto no celular, sem app nativo
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.04] sm:text-5xl lg:text-6xl">
                O funcionário abre, tira a foto e bate o ponto sem pensar duas vezes.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/78">
                Pointer foi desenhado para duas coisas ficarem óbvias: o colaborador registra rápido e a empresa enxerga
                prova real do registro com foto, localização e horário validado pelo servidor.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-[1.2rem] bg-highlight px-5 py-4 font-semibold text-brand transition hover:opacity-95"
                >
                  Entrar no sistema
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-[1.2rem] border border-white/16 bg-white/8 px-5 py-4 font-semibold text-white transition hover:bg-white/12"
                >
                  Criar ambiente de teste
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              <article className="rounded-[1.8rem] border border-white/12 bg-white/8 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-white/55">Como funciona</p>
                <div className="mt-4 grid gap-3">
                  {[
                    "O funcionário entra no app e toca em Bater ponto.",
                    "O sistema pede foto e localização na hora do registro.",
                    "O admin acompanha tudo no painel com histórico e inconsistências.",
                  ].map((step, index) => (
                    <div key={step} className="flex items-start gap-3 rounded-[1.2rem] bg-black/14 px-4 py-4">
                      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-highlight text-sm font-semibold text-brand">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-6 text-white/84">{step}</p>
                    </div>
                  ))}
                </div>
              </article>

              <div className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-[1.6rem] border border-white/12 bg-white/8 p-5">
                  <Users2 className="size-5 text-highlight" />
                  <h2 className="mt-4 text-lg font-semibold">Para empresa</h2>
                  <p className="mt-2 text-sm leading-6 text-white/76">
                    Dashboard admin, relatórios, auditoria e visão clara de quem bateu ponto, onde e quando.
                  </p>
                </article>
                <article className="rounded-[1.6rem] border border-white/12 bg-white/8 p-5">
                  <Smartphone className="size-5 text-highlight" />
                  <h2 className="mt-4 text-lg font-semibold">Para colaborador</h2>
                  <p className="mt-2 text-sm leading-6 text-white/76">
                    Experiência simples, botões grandes e PWA pronta para instalar na tela inicial do celular.
                  </p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="glass rounded-[2rem] p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Escolha o próximo passo</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Link
                href="/login"
                className="group rounded-[1.7rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,243,237,0.92))] p-5 transition hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="grid size-11 place-items-center rounded-2xl bg-brand text-white">
                    <Clock3 className="size-5" />
                  </div>
                  <ChevronRight className="size-5 text-muted transition group-hover:translate-x-0.5" />
                </div>
                <h2 className="mt-5 text-xl font-semibold">Já tenho acesso</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Entre com seu e-mail e senha para bater ponto ou abrir o painel administrativo.
                </p>
              </Link>

              <Link
                href="/signup"
                className="group rounded-[1.7rem] border border-border/80 bg-[linear-gradient(180deg,rgba(27,27,27,0.97),rgba(10,10,10,0.98))] p-5 text-white transition hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="grid size-11 place-items-center rounded-2xl bg-highlight text-brand">
                    <Users2 className="size-5" />
                  </div>
                  <ChevronRight className="size-5 text-white/55 transition group-hover:translate-x-0.5" />
                </div>
                <h2 className="mt-5 text-xl font-semibold">Quero testar o Pointer</h2>
                <p className="mt-2 text-sm leading-6 text-white/74">
                  Crie um ambiente de trial para sua empresa e comece a configurar os primeiros funcionários.
                </p>
              </Link>
            </div>
          </article>

          <article className="glass rounded-[2rem] p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Por que o Pointer funciona</p>
            <div className="mt-5 grid gap-4">
              {[
                {
                  icon: Smartphone,
                  title: "Fluxo rápido no celular",
                  body: "Botão principal claro, câmera do aparelho e instalação como app na tela inicial.",
                },
                {
                  icon: MapPinned,
                  title: "Registro com prova",
                  body: "Foto, localização e horário do servidor ajudam a dar segurança para a empresa.",
                },
                {
                  icon: Shield,
                  title: "Base pronta para crescer",
                  body: "Arquitetura isolada por cliente, billing, branding e multi-tenant preparados para venda futura.",
                },
                {
                  icon: TimerReset,
                  title: "Operação sem ruído",
                  body: "O sistema define a próxima batida esperada e reduz erro de uso no dia a dia.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 rounded-[1.4rem] border border-border/70 bg-white/70 px-4 py-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-highlight/18 text-brand">
                    <item.icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            "Foto obrigatória em toda batida",
            "Horário oficial sempre do servidor",
            "Instalação como PWA no Android e iPhone",
          ].map((item) => (
            <div key={item} className="glass rounded-[1.7rem] px-5 py-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-brand" />
                <p className="text-sm font-semibold">{item}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

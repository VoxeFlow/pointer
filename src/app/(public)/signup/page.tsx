import Link from "next/link";

import { SignupForm } from "@/components/auth/signup-form";
import { BrandMark } from "@/components/ui/brand-mark";

export default function SignupPage() {
  return (
    <main className="safe-top px-4 py-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="glass rounded-[2rem] bg-[radial-gradient(circle_at_12%_18%,rgba(212,173,91,0.34),transparent_10%),linear-gradient(155deg,#111111_0%,#191919_52%,#050505_100%)] p-8 text-white">
          <BrandMark href="/" mode="full" theme="light" priority />
          <h1 className="mt-6 text-4xl font-semibold leading-tight">Crie seu ambiente e teste o Pointer por 14 dias.</h1>
          <p className="mt-4 max-w-lg text-sm text-white/80">
            O onboarding cria uma organizacao isolada, um admin inicial e leva voce direto para o painel, sem tocar em
            estruturas de outros clientes.
          </p>

          <div className="mt-8 grid gap-3 text-sm text-white/85">
            <div className="rounded-[1.4rem] border border-white/15 bg-white/8 p-4">
              Tenant isolado com status, plano e capacidade
            </div>
            <div className="rounded-[1.4rem] border border-white/15 bg-white/8 p-4">
              Setup inicial sem depender de App Store ou projeto compartilhado
            </div>
            <div className="rounded-[1.4rem] border border-white/15 bg-white/8 p-4">
              Base pronta para evoluir para SaaS comercial
            </div>
          </div>
        </section>

        <section className="glass rounded-[2rem] p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-semibold">Comecar agora</h2>
            <p className="mt-2 text-sm text-muted">
              Depois do cadastro, voce entra automaticamente como admin do seu ambiente.
            </p>
          </div>

          <SignupForm />

          <p className="mt-6 text-sm text-muted">
            Ja tem acesso? <Link href="/login" className="font-semibold text-brand">Entrar no Pointer</Link>
          </p>
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";

import { BrandMark } from "@/components/ui/brand-mark";

export default function SuspendedPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,173,91,0.18),transparent_24%),#0f0f0f] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center">
        <div className="glass w-full rounded-[2rem] border border-white/10 bg-white/5 p-6 text-center">
          <div className="flex justify-center">
            <BrandMark mode="full" />
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.22em] text-white/55">Acesso temporariamente restrito</p>
          <h1 className="mt-3 text-3xl font-semibold">Organizacao suspensa</h1>
          <p className="mt-4 text-sm text-white/75">
            O uso do Pointer por esta empresa foi temporariamente bloqueado. Se voce for colaborador, fale com o responsavel
            administrativo para regularizar a assinatura do sistema.
          </p>
          <div className="mt-6 grid gap-3">
            <Link href="/login" className="rounded-[1rem] bg-highlight px-4 py-3 font-semibold text-brand">
              Voltar para o login
            </Link>
            <p className="text-sm text-white/55">Administradores ainda podem acessar a area financeira para resolver a cobranca.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { BrandMark } from "@/components/ui/brand-mark";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error ? decodeURIComponent(params.error) : null;

  return (
    <main className="safe-top min-h-screen bg-[#111111] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-sm items-center">
        <section className="w-full rounded-[2rem] border border-white/10 bg-[#181818] p-7 text-white shadow-[0_32px_100px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="flex justify-center">
            <BrandMark href="/" mode="icon" className="[&_img]:size-20" />
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">Pointer</h1>
            <p className="mt-2 text-sm text-white/60">Login e senha para acessar o sistema.</p>
          </div>

          <div className="mt-8">
            <LoginForm error={error} />
          </div>

          {process.env.NODE_ENV !== "production" ? (
            <div className="mt-5 rounded-[1.1rem] border border-[#d4ad5b]/30 bg-[#d4ad5b]/10 px-4 py-3 text-sm text-[#f7e6bd]">
              <p className="font-medium">Ambiente local</p>
              <p className="mt-1 break-all">admin@pointer.local / ChangeMe123!</p>
              <p className="mt-2 text-xs text-[#f7e6bd]/80">Funcionarios cadastrados pelo admin entram com e-mail e senha provisoria e trocam a senha no primeiro acesso.</p>
            </div>
          ) : null}

          <div className="mt-6 text-center text-sm text-white/45">
            <Link href="/" className="font-medium text-white/70 transition hover:text-white">
              Voltar
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

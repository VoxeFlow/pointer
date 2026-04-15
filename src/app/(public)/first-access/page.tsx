import { redirect } from "next/navigation";

import { FirstAccessForm } from "@/components/auth/first-access-form";
import { BrandMark } from "@/components/ui/brand-mark";
import { requireSession } from "@/lib/auth/guards";
import { passwordResetService } from "@/services/password-reset-service";

function getDefaultAppPath(role: "ADMIN" | "ACCOUNTANT" | "EMPLOYEE") {
  if (role === "ADMIN") return "/admin";
  if (role === "ACCOUNTANT") return "/admin/accounting";
  return "/employee";
}

export default async function FirstAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession({ allowPasswordChange: true });
  const params = await searchParams;
  const error = params.error ? decodeURIComponent(params.error) : null;

  if (!session.mustChangePassword) {
    redirect(getDefaultAppPath(session.role));
  }

  async function completeFirstAccess(formData: FormData) {
    "use server";

    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password.length < 8) {
      redirect("/first-access?error=A+senha+deve+ter+ao+menos+8+caracteres");
    }

    if (password !== confirmPassword) {
      redirect("/first-access?error=As+senhas+nao+coincidem");
    }

    await passwordResetService.completeFirstAccess(session.sub, password);
    redirect(getDefaultAppPath(session.role));
  }

  return (
    <main className="safe-top min-h-screen bg-[#111111] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-sm items-center">
        <section className="w-full rounded-[2rem] border border-white/10 bg-[#181818] p-7 text-white shadow-[0_32px_100px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="flex justify-center">
            <BrandMark href="/" mode="icon" className="[&_img]:size-20" />
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">Primeiro acesso</h1>
            <p className="mt-2 text-sm text-white/60">
              Defina agora sua senha definitiva para entrar no Pointer e registrar o ponto.
            </p>
          </div>

          <div className="mt-8">
            <FirstAccessForm action={completeFirstAccess} error={error} />
          </div>
        </section>
      </div>
    </main>
  );
}

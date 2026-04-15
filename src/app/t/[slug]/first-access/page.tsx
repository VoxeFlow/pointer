import { redirect } from "next/navigation";

import { FirstAccessForm } from "@/components/auth/first-access-form";
import { BrandMark } from "@/components/ui/brand-mark";
import { requireTenantSession } from "@/lib/auth/guards";
import { passwordResetService } from "@/services/password-reset-service";

function getTenantDefaultAppPath(slug: string, role: "ADMIN" | "ACCOUNTANT" | "EMPLOYEE") {
  if (role === "ADMIN") return `/t/${slug}/admin`;
  if (role === "ACCOUNTANT") return `/t/${slug}/admin/accounting`;
  return `/t/${slug}/employee`;
}

export default async function TenantFirstAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const session = await requireTenantSession(slug, { allowPasswordChange: true });
  const query = await searchParams;
  const error = query.error ? decodeURIComponent(query.error) : null;

  if (!session.mustChangePassword) {
    redirect(getTenantDefaultAppPath(slug, session.role));
  }

  async function completeFirstAccess(formData: FormData) {
    "use server";

    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password.length < 8) {
      redirect(`/t/${slug}/first-access?error=A+senha+deve+ter+ao+menos+8+caracteres`);
    }

    if (password !== confirmPassword) {
      redirect(`/t/${slug}/first-access?error=As+senhas+nao+coincidem`);
    }

    await passwordResetService.completeFirstAccess(session.sub, password);
    redirect(getTenantDefaultAppPath(slug, session.role));
  }

  return (
    <main className="safe-top min-h-screen bg-[#111111] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-sm items-center">
        <section className="w-full rounded-[2rem] border border-white/10 bg-[#181818] p-7 text-white shadow-[0_32px_100px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="flex justify-center">
            <BrandMark href={`/t/${slug}`} mode="icon" className="[&_img]:size-20" />
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">Primeiro acesso</h1>
            <p className="mt-2 text-sm text-white/60">
              Crie sua senha definitiva para continuar no Pointer.
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

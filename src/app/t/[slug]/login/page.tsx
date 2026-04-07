import Link from "next/link";
import { notFound } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { TenantBrand } from "@/components/ui/tenant-brand";
import { getOrganizationBySlug } from "@/lib/tenant";

export default async function TenantLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const organization = await getOrganizationBySlug(slug);
  const error = query.error ? decodeURIComponent(query.error) : null;

  if (!organization) {
    notFound();
  }

  return (
    <main className="safe-top flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <section
          className="glass hidden rounded-[2rem] p-8 text-white lg:flex lg:flex-col lg:justify-between"
          style={{
            background: `radial-gradient(circle at 12% 18%, ${organization.brandAccentColor || "rgba(212,173,91,0.34)"} 0%, transparent 10%), linear-gradient(155deg, ${organization.brandPrimaryColor || "#111111"} 0%, #191919 52%, #050505 100%)`,
          }}
        >
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/55">Tenant dedicado</p>
            <div className="mt-5">
              <TenantBrand
                organizationName={organization.name}
                brandDisplayName={organization.brandDisplayName}
                brandLogoUrl={organization.brandLogoUrl}
                brandPrimaryColor={organization.brandPrimaryColor}
                brandAccentColor={organization.brandAccentColor}
              />
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight">Entrar no ambiente {organization.slug}</h1>
            <p className="mt-4 max-w-md text-sm text-white/80">
              Esta pagina ja representa a base para acesso por subdominio do cliente, mantendo separacao clara entre tenants.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/12 bg-white/8 p-4 text-sm text-white/80">
            Use este fluxo quando quiser apresentar ou operar o Pointer com uma entrada dedicada por organizacao.
            Depois do login, o acesso passa pelo gateway do tenant antes de entrar na area protegida.
          </div>
        </section>

        <section className="glass rounded-[2rem] p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.28em] text-muted">Acesso por slug</p>
            <div className="mt-3">
              <TenantBrand
                organizationName={organization.name}
                brandDisplayName={organization.brandDisplayName}
                brandLogoUrl={organization.brandLogoUrl}
                brandPrimaryColor={organization.brandPrimaryColor}
                brandAccentColor={organization.brandAccentColor}
                compact
              />
            </div>
          </div>

          <LoginForm tenantSlug={organization.slug} error={error} />

          <p className="mt-6 text-sm text-muted">
            Voltar para a entrada geral? <Link href="/login" className="font-semibold text-brand">Usar login padrao</Link>
          </p>
        </section>
      </div>
    </main>
  );
}

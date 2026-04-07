import { notFound } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Building2, ShieldCheck, Smartphone } from "lucide-react";

import { BrandMark } from "@/components/ui/brand-mark";
import { TenantBrand } from "@/components/ui/tenant-brand";
import { getOrganizationBySlug, getTenantPublicUrl } from "@/lib/tenant";

export default async function TenantLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const organization = await getOrganizationBySlug(slug);

  if (!organization) {
    notFound();
  }

  return (
    <main className="safe-top px-4 py-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section
          className="glass rounded-[2rem] p-6 text-white"
          style={{
            background: `radial-gradient(circle at 12% 18%, ${organization.brandAccentColor || "rgba(212,173,91,0.30)"} 0%, transparent 10%), linear-gradient(160deg, ${organization.brandPrimaryColor || "rgba(17,17,17,0.95)"} 0%, #050505 96%)`,
          }}
        >
          <BrandMark href="/" mode="full" theme="light" priority />
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.24em] text-white/55">Ambiente da organizacao</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight">
                {organization.brandDisplayName || organization.name}
              </h1>
              <p className="mt-3 text-sm text-white/78">
                Entrada dedicada do tenant `{organization.slug}`. Esta fundacao prepara o Pointer para operar com slug e
                subdominio por cliente no futuro.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
              <TenantBrand
                organizationName={organization.name}
                brandDisplayName={organization.brandDisplayName}
                brandLogoUrl={organization.brandLogoUrl}
                brandPrimaryColor={organization.brandPrimaryColor}
                brandAccentColor={organization.brandAccentColor}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/t/${organization.slug}/login`}
              className="rounded-[1.2rem] bg-white px-5 py-4 font-semibold"
              style={{ color: organization.brandPrimaryColor || "#171717" }}
            >
              Entrar neste ambiente
            </Link>
            <Link
              href="/signup"
              className="rounded-[1.2rem] border border-white/15 bg-white/8 px-5 py-4 font-semibold text-white"
            >
              Criar novo tenant
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Building2, title: "Slug dedicado", body: `Acesso identificado por ${organization.slug}.` },
            { icon: Smartphone, title: "PWA pronta", body: "Mesmo fluxo mobile-first do Pointer principal." },
            { icon: ShieldCheck, title: "Tenant isolado", body: "Dados, branding e regras separados por organizacao." },
            { icon: BadgeCheck, title: "Base comercial", body: `Plano atual ${organization.plan} com capacidade de ${organization.maxEmployees} funcionarios.` },
          ].map((item) => (
            <article key={item.title} className="glass rounded-[1.5rem] p-5">
              <item.icon className="size-6 text-brand" />
              <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-muted">{item.body}</p>
            </article>
          ))}
        </section>

        <section className="glass rounded-[1.75rem] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">URL do tenant</p>
          <p className="mt-3 break-all text-lg font-semibold">{getTenantPublicUrl(organization.slug)}</p>
          <p className="mt-2 text-sm text-muted">
            No MVP, o tenant tambem continua disponivel pela rota dedicada `/t/{organization.slug}`.
          </p>
          <p className="mt-2 text-sm text-muted">
            Apos o login, o gateway autenticado usa `/t/{organization.slug}/app` para validar o tenant antes de abrir o painel.
          </p>
        </section>
      </div>
    </main>
  );
}

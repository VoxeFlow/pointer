"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, Clock3, LayoutDashboard, ListChecks, Menu, Settings, Users, X } from "lucide-react";

import { BrandMark } from "@/components/ui/brand-mark";
import { TenantBrand } from "@/components/ui/tenant-brand";
import { getInitials } from "@/lib/utils";
import type { SessionPayload } from "@/lib/auth/session";
import type { TenantBranding } from "@/lib/branding";

const employeeLinks = [
  { href: "/employee", label: "Ponto", icon: Clock3 },
  { href: "/employee/workday", label: "Jornada", icon: BriefcaseBusiness },
  { href: "/employee/history", label: "Marcacoes", icon: ListChecks },
  { href: "/employee/help", label: "Mais", icon: Settings },
];

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/employees", label: "Funcionarios", icon: Users },
  { href: "/admin/records", label: "Registros", icon: ListChecks },
  { href: "/admin/reports", label: "Relatorios", icon: BriefcaseBusiness },
  { href: "/admin/settings", label: "Configuracoes", icon: Settings },
];

export function AppShell({
  children,
  session,
  branding,
  basePath = "",
  organizationStatus,
  billingStatus,
}: {
  children: React.ReactNode;
  session: SessionPayload;
  branding?: TenantBranding;
  basePath?: string;
  organizationStatus?: "TRIAL" | "ACTIVE" | "SUSPENDED";
  billingStatus?: "NONE" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID" | "INCOMPLETE";
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const links = (session.role === "ADMIN" ? adminLinks : employeeLinks).map((link) => ({
    ...link,
    href: `${basePath}${link.href}`,
  }));
  const tenantEntryHref = `/t/${session.organizationSlug}`;
  const needsBillingAttention =
    billingStatus === "PAST_DUE" || billingStatus === "UNPAID" || billingStatus === "CANCELED" || billingStatus === "INCOMPLETE";
  const showAdminAlert = session.role === "ADMIN" && (organizationStatus === "SUSPENDED" || needsBillingAttention);
  const adminSettingsHref = `${basePath}/admin/settings`;

  function isActiveLink(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!mobileMenuRef.current) {
        return;
      }

      const target = event.target as Node | null;
      if (target && !mobileMenuRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("touchstart", handlePointerDown);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <header className="safe-top sticky top-0 z-20 border-b border-white/10 bg-[#111111] px-4 py-3 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <BrandMark mode="full" priority className="shrink-0 [&_img]:w-[150px] sm:[&_img]:w-[185px]" />
            <div className="hidden h-9 w-px bg-white/10 lg:block" />
            <nav className="hidden items-center gap-2 lg:flex">
              {links.map((link) => {
                const active = isActiveLink(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active ? "bg-highlight text-brand" : "text-white/68 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            {branding ? (
              <>
                <div className="hidden h-9 w-px bg-white/10 xl:block" />
                <Link href={tenantEntryHref} className="hidden xl:block">
                  <TenantBrand
                    organizationName={branding.organizationName}
                    brandDisplayName={branding.brandDisplayName}
                    brandLogoUrl={branding.brandLogoUrl}
                    brandPrimaryColor={branding.brandPrimaryColor}
                    brandAccentColor={branding.brandAccentColor}
                    compact
                  />
                </Link>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden flex-col items-end gap-0.5 md:flex">
              <span className="text-sm font-bold leading-none text-white">{session.name}</span>
              <span className="text-[0.65rem] font-medium uppercase tracking-wider text-white/40">{session.role}</span>
            </div>

            <div className="flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 pl-4 pr-1">
              <span className="text-sm font-semibold text-white/90 md:hidden">{getInitials(session.name)}</span>
              <div className="hidden h-8 w-8 place-items-center rounded-xl bg-highlight text-xs font-bold text-brand md:grid">
                {getInitials(session.name)}
              </div>
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="flex h-8 items-center rounded-xl px-3 text-[0.7rem] font-bold uppercase tracking-wider text-white/50 transition hover:bg-white/10 hover:text-white active:scale-95">
                  Sair
                </button>
              </form>
            </div>

            <div ref={mobileMenuRef} className="relative md:hidden">
              <button
                type="button"
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                onClick={() => setMobileMenuOpen((current) => !current)}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/8 text-white transition active:scale-[0.98]"
              >
                {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>

              {mobileMenuOpen ? (
                <div className="absolute right-0 top-14 w-[220px] rounded-[1.25rem] border border-white/10 bg-[#171717] p-2 shadow-[0_18px_36px_rgba(0,0,0,0.28)]">
                  <div className="grid gap-1">
                    <div className="mb-2 px-3 py-2">
                       <p className="text-xs font-bold uppercase tracking-widest text-white/40">Navegaçao</p>
                    </div>
                    {links.map((link) => {
                      const active = isActiveLink(link.href);
                      const Icon = link.icon;

                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`flex items-center gap-3 rounded-[1rem] px-3 py-3 text-sm font-semibold transition ${
                            active ? "bg-highlight text-brand" : "text-white/80 hover:bg-white/8 hover:text-white"
                          }`}
                        >
                          <Icon className="size-4" />
                          {link.label}
                        </Link>
                      );
                    })}
                    <div className="my-2 h-px bg-white/10" />
                    <form action="/api/auth/logout" method="POST">
                      <button type="submit" className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-sm font-bold text-red-400 transition hover:bg-white/8">
                        Sair do Pointer
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {showAdminAlert ? (
        <section className={`px-4 py-3 text-sm ${organizationStatus === "SUSPENDED" ? "bg-amber-200 text-amber-950" : "bg-[#22180a] text-[#f9e5b1]"}`}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <p className="font-medium">
              {organizationStatus === "SUSPENDED"
                ? "Organizacao suspensa. Funcionarios ficam bloqueados ate a regularizacao."
                : "A assinatura do Pointer requer atencao financeira. Vale revisar a cobranca agora."}
            </p>
            <Link href={adminSettingsHref} className="rounded-full border border-current px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]">
              Resolver agora
            </Link>
          </div>
        </section>
      ) : null}

      <main className="bg-[#f3efe8] pb-8 text-foreground">
        {children}
      </main>
    </div>
  );
}

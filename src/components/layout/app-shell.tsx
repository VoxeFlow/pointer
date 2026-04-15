"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, BriefcaseBusiness, Clock3, LayoutDashboard, ListChecks, Menu, Settings, Users, X } from "lucide-react";

import { BrandMark } from "@/components/ui/brand-mark";
import type { SessionPayload } from "@/lib/auth/session";
import type { TenantBranding } from "@/lib/branding";

const employeeLinks = [
  { href: "/employee", label: "Ponto", icon: Clock3 },
  { href: "/employee/workday", label: "Jornada", icon: BriefcaseBusiness },
  { href: "/employee/history", label: "Marcacoes", icon: ListChecks },
  { href: "/employee/certificates", label: "Atestados", icon: AlertTriangle },
  { href: "/employee/payslips", label: "Contracheque", icon: BriefcaseBusiness },
  { href: "/employee/help", label: "Mais", icon: Settings },
];

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/employees", label: "Funcionarios", icon: Users },
  { href: "/admin/records", label: "Registros", icon: ListChecks },
  { href: "/admin/failures", label: "Falhas", icon: AlertTriangle },
  { href: "/admin/reports", label: "Relatorios", icon: BriefcaseBusiness },
  { href: "/admin/accounting", label: "Contador", icon: BriefcaseBusiness },
  { href: "/admin/settings", label: "Configuracoes", icon: Settings },
];

const accountantLinks = [
  { href: "/admin/accounting", label: "Contador", icon: BriefcaseBusiness },
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
  const baseLinks =
    session.role === "ADMIN" ? adminLinks : session.role === "ACCOUNTANT" ? accountantLinks : employeeLinks;
  const links = baseLinks.map((link) => ({
    ...link,
    href: `${basePath}${link.href}`,
  }));
  const needsBillingAttention =
    billingStatus === "PAST_DUE" || billingStatus === "UNPAID" || billingStatus === "CANCELED" || billingStatus === "INCOMPLETE";
  const showAdminAlert = (session.role === "ADMIN" || session.role === "ACCOUNTANT") && (organizationStatus === "SUSPENDED" || needsBillingAttention);
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
    <div className="flex min-h-screen flex-col bg-[#111111] text-white">
      <header className="safe-top sticky top-0 z-20 border-b border-white/10 bg-[#111111] px-4 py-3 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <BrandMark mode="full" priority className="shrink-0 [&_img]:w-[182px] sm:[&_img]:w-[220px]" />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end md:flex">
              <span className="max-w-[180px] truncate text-sm font-bold leading-none text-white">{session.name}</span>
              <span className="max-w-[220px] truncate text-[0.68rem] font-semibold uppercase tracking-wider text-white/45">
                {session.role === "ACCOUNTANT"
                  ? `Contador • ${branding?.brandDisplayName || branding?.organizationName || ""}`
                  : `${session.role === "ADMIN" ? "Admin" : "Funcionário"} • ${branding?.brandDisplayName || branding?.organizationName || ""}`}
              </span>
            </div>

            <div ref={mobileMenuRef} className="relative">
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
                    <div className="mb-1 px-3 py-2">
                       <p className="text-[0.6rem] font-bold uppercase tracking-widest text-white/30">Navegaçao</p>
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
                      <button type="submit" className="flex w-full items-center gap-3 rounded-[1.1rem] bg-red-500/10 px-3 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500/20 active:scale-[0.98]">
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

      <main className="flex-1 bg-[#f3efe8] pb-8 text-foreground">
        {children}
      </main>
    </div>
  );
}

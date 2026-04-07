import { OrganizationPlan } from "@prisma/client";

export const planLabels: Record<OrganizationPlan, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

export const planDescriptions: Record<OrganizationPlan, string> = {
  STARTER: "Operacao enxuta para equipes pequenas.",
  PRO: "Mais capacidade para escalar o uso do Pointer.",
  ENTERPRISE: "Alta capacidade para operacao ampla e futura customizacao.",
};

export const planCapacities: Record<OrganizationPlan, number> = {
  STARTER: 25,
  PRO: 100,
  ENTERPRISE: 500,
};

export const planHighlights: Record<OrganizationPlan, string[]> = {
  STARTER: ["Ate 25 funcionarios", "Operacao essencial", "PWA completa"],
  PRO: ["Ate 100 funcionarios", "Escala maior por tenant", "Mais folga operacional"],
  ENTERPRISE: ["Ate 500 funcionarios", "Capacidade ampliada", "Base pronta para customizacao futura"],
};

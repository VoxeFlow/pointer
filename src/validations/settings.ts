import { z } from "zod";
import { OrganizationPlan, OrganizationStatus } from "@prisma/client";

export const organizationSettingsSchema = z.object({
  accountantReportEmail: z.union([z.literal(""), z.email("Informe um e-mail valido para o contador.")]).optional(),
  monthlyReportEnabled: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true" || value === "on"),
});

export const commercialSettingsSchema = z.object({
  status: z.nativeEnum(OrganizationStatus),
  plan: z.nativeEnum(OrganizationPlan),
  maxEmployees: z.coerce.number().int().min(1).max(5000),
});

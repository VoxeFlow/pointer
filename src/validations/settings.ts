import { z } from "zod";
import { OrganizationPlan, OrganizationStatus } from "@prisma/client";

const optionalLatitudeSchema = z.preprocess((value) => {
  if (value === "" || value == null) {
    return undefined;
  }

  if (typeof value === "string") {
    return Number(value.replace(",", "."));
  }

  return value;
}, z.number().min(-90, "Latitude invalida.").max(90, "Latitude invalida.").optional());

const optionalLongitudeSchema = z.preprocess((value) => {
  if (value === "" || value == null) {
    return undefined;
  }

  if (typeof value === "string") {
    return Number(value.replace(",", "."));
  }

  return value;
}, z.number().min(-180, "Longitude invalida.").max(180, "Longitude invalida.").optional());

export const organizationSettingsSchema = z.object({
  accountantReportEmail: z.union([z.literal(""), z.email("Informe um e-mail valido para o contador.")]).optional(),
  monthlyReportEnabled: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true" || value === "on")
    .optional(),
  enforceWorksiteRadius: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true" || value === "on")
    .optional()
    .default(false),
  worksiteAddress: z.string().trim().max(240, "Informe um endereco mais curto.").optional(),
  worksiteRadiusMeters: z.coerce.number().int().min(30, "Use no minimo 30 metros.").max(5000, "Use no maximo 5000 metros.").optional(),
  worksiteLatitude: optionalLatitudeSchema,
  worksiteLongitude: optionalLongitudeSchema,
}).superRefine((value, ctx) => {
  if (value.enforceWorksiteRadius && !value.worksiteAddress?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["worksiteAddress"],
      message: "Informe o endereco base para ativar a validacao por raio.",
    });
  }

  const hasLatitude = value.worksiteLatitude !== undefined;
  const hasLongitude = value.worksiteLongitude !== undefined;

  if (hasLatitude !== hasLongitude) {
    ctx.addIssue({
      code: "custom",
      path: hasLatitude ? ["worksiteLongitude"] : ["worksiteLatitude"],
      message: "Informe latitude e longitude juntas para fixar o local manualmente.",
    });
  }
});

export const commercialSettingsSchema = z.object({
  status: z.nativeEnum(OrganizationStatus),
  plan: z.nativeEnum(OrganizationPlan),
  maxEmployees: z.coerce.number().int().min(1).max(5000),
});

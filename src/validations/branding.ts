import { z } from "zod";

const hexColor = /^#([0-9a-fA-F]{6})$/;

export const brandingSettingsSchema = z.object({
  brandDisplayName: z.string().trim().max(50).optional().or(z.literal("")),
  brandLogoUrl: z.union([z.literal(""), z.url("Informe uma URL valida para a logo.")]).optional(),
  brandPrimaryColor: z
    .string()
    .trim()
    .regex(hexColor, "Use uma cor hexadecimal no formato #RRGGBB.")
    .optional()
    .or(z.literal("")),
  brandAccentColor: z
    .string()
    .trim()
    .regex(hexColor, "Use uma cor hexadecimal no formato #RRGGBB.")
    .optional()
    .or(z.literal("")),
});

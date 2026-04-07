import { z } from "zod";

export const signupSchema = z.object({
  organizationName: z.string().trim().min(2, "Informe o nome da empresa."),
  legalName: z.string().trim().optional().or(z.literal("")),
  documentNumber: z.string().trim().optional().or(z.literal("")),
  adminName: z.string().trim().min(3, "Informe o nome do administrador."),
  adminEmail: z.email("Informe um e-mail valido.").trim().toLowerCase(),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
  employeeEstimate: z.coerce.number().int().min(1).max(1000),
});

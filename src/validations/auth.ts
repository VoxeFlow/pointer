import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Informe um e-mail valido.").trim().toLowerCase(),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
  tenantSlug: z.string().trim().min(1).optional(),
});

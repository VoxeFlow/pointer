import { z } from "zod";

export const adminAccountSettingsSchema = z
  .object({
    email: z.email("Informe um e-mail valido.").trim().toLowerCase(),
    currentPassword: z.string().min(1, "Informe sua senha atual."),
    newPassword: z.string().optional(),
    confirmNewPassword: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const nextPassword = value.newPassword?.trim() ?? "";
    const confirmPassword = value.confirmNewPassword?.trim() ?? "";

    if (!nextPassword && !confirmPassword) {
      return;
    }

    if (nextPassword.length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "A nova senha precisa ter pelo menos 8 caracteres.",
      });
    }

    if (!confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmNewPassword"],
        message: "Confirme a nova senha.",
      });
    }

    if (nextPassword && confirmPassword && nextPassword !== confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmNewPassword"],
        message: "A confirmacao da senha nao confere.",
      });
    }
  });

export type AdminAccountSettingsInput = z.infer<typeof adminAccountSettingsSchema>;

import { RecordType } from "@prisma/client";
import { z } from "zod";

export const createTimeAdjustmentRequestSchema = z.object({
  requestedDate: z.string().min(1, "Informe a data."),
  requestedTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Informe o horário no formato HH:mm.")
    .optional()
    .or(z.literal("")),
  requestedType: z.nativeEnum(RecordType).optional().nullable(),
  reason: z.string().trim().min(8, "Explique o motivo com mais detalhes.").max(600, "Use no máximo 600 caracteres."),
});

export type CreateTimeAdjustmentRequestInput = z.infer<typeof createTimeAdjustmentRequestSchema>;

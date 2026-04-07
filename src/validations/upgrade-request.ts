import { OrganizationPlan } from "@prisma/client";
import { z } from "zod";

export const upgradeRequestSchema = z.object({
  desiredPlan: z.nativeEnum(OrganizationPlan),
  message: z.string().trim().max(500).optional().or(z.literal("")),
});

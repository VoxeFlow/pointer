import { RecordSource } from "@prisma/client";
import { z } from "zod";

export const createTimeRecordSchema = z.object({
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  accuracy: z.coerce.number().optional(),
  clientTimestamp: z.string().datetime().optional(),
  geoCapturedAt: z.string().datetime().optional(),
  source: z.nativeEnum(RecordSource).default(RecordSource.BROWSER),
});

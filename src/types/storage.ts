import type { Prisma } from "@prisma/client";

export type UploadedPhoto = {
  url: string;
  metadata: Prisma.JsonObject;
};

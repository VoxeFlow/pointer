import type { Prisma } from "@prisma/client";

export type UploadedAsset = {
  url: string;
  metadata: Prisma.JsonObject;
};

export type UploadedPhoto = UploadedAsset;

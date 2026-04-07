import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { env } from "@/lib/env";
import type { UploadedPhoto } from "@/types/storage";

type UploadPhotoInput = {
  file: File;
  fileName: string;
};

export async function uploadPhotoToLocal({ file, fileName }: UploadPhotoInput): Promise<UploadedPhoto> {
  const folder = path.join(process.cwd(), env.POINTER_STORAGE_LOCAL_DIR);
  await mkdir(folder, { recursive: true });

  const safeName = `${randomUUID()}-${fileName.replaceAll("/", "-")}`;
  const fullPath = path.join(folder, safeName);
  const arrayBuffer = await file.arrayBuffer();

  await writeFile(fullPath, Buffer.from(arrayBuffer));

  return {
    url: `/${env.POINTER_STORAGE_LOCAL_DIR.replace(/^public\//, "")}/${safeName}`,
    metadata: {
      size: file.size,
      type: file.type,
      name: file.name,
    } satisfies Prisma.JsonObject,
  };
}

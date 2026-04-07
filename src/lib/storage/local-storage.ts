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
  // Verificação para evitar falhas silenciosas na Vercel
  if (process.env.VERCEL === "1") {
    throw new Error(
      "O driver de storage 'local' não funciona na Vercel (sistema de arquivos somente-leitura). Configure POINTER_STORAGE_DRIVER=supabase no seu painel da Vercel.",
    );
  }

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

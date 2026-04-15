import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { env } from "@/lib/env";
import type { UploadedAsset, UploadedPhoto } from "@/types/storage";

type UploadPhotoInput = {
  file: File;
  fileName: string;
};

async function uploadFileToLocalDirectory({
  file,
  fileName,
  targetDir,
}: UploadPhotoInput & { targetDir: string }): Promise<UploadedAsset> {
  // Verificação para evitar falhas silenciosas na Vercel
  if (process.env.VERCEL === "1") {
    throw new Error(
      "O driver de storage 'local' não funciona na Vercel (sistema de arquivos somente-leitura). Configure POINTER_STORAGE_DRIVER=supabase no seu painel da Vercel.",
    );
  }

  const folder = path.join(process.cwd(), targetDir);
  await mkdir(folder, { recursive: true });

  const safeName = `${randomUUID()}-${fileName.replaceAll("/", "-")}`;
  const fullPath = path.join(folder, safeName);
  const arrayBuffer = await file.arrayBuffer();

  await writeFile(fullPath, Buffer.from(arrayBuffer));

  return {
    url: `/${targetDir.replace(/^public\//, "")}/${safeName}`,
    metadata: {
      size: file.size,
      type: file.type,
      name: file.name,
    } satisfies Prisma.JsonObject,
  };
}

export async function uploadPhotoToLocal({ file, fileName }: UploadPhotoInput): Promise<UploadedPhoto> {
  return uploadFileToLocalDirectory({
    file,
    fileName,
    targetDir: env.POINTER_STORAGE_LOCAL_DIR,
  });
}

export async function uploadDocumentToLocal({ file, fileName }: UploadPhotoInput): Promise<UploadedAsset> {
  return uploadFileToLocalDirectory({
    file,
    fileName,
    targetDir: "public/uploads/documents",
  });
}

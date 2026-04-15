import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { env } from "@/lib/env";
import type { UploadedAsset, UploadedPhoto } from "@/types/storage";

type UploadPhotoInput = {
  file: File;
  fileName: string;
};

function stripExtension(value: string) {
  const dotIndex = value.lastIndexOf(".");
  return dotIndex > 0 ? value.slice(0, dotIndex) : value;
}

function assertCloudinaryConfigured() {
  if (
    !env.POINTER_CLOUDINARY_CLOUD_NAME ||
    !env.POINTER_CLOUDINARY_API_KEY ||
    !env.POINTER_CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "Cloudinary não configurado. Adicione as chaves POINTER_CLOUDINARY_* no painel da Vercel.",
    );
  }
}

async function uploadToCloudinary({
  file,
  fileName,
  resourceType,
  folder,
}: UploadPhotoInput & {
  resourceType: "image" | "raw";
  folder: string;
}): Promise<UploadedAsset> {
  assertCloudinaryConfigured();

  const publicId = stripExtension(fileName);
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign: Record<string, string> = {
    folder,
    overwrite: "false",
    public_id: publicId,
    timestamp: String(timestamp),
  };

  const signatureBase = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join("&");

  const signature = createHash("sha1")
    .update(`${signatureBase}${env.POINTER_CLOUDINARY_API_SECRET}`)
    .digest("hex");

  const arrayBuffer = await file.arrayBuffer();
  const formData = new FormData();
  formData.append("file", new Blob([arrayBuffer], { type: file.type }), file.name);
  formData.append("folder", folder);
  formData.append("public_id", publicId);
  formData.append("overwrite", "false");
  formData.append("api_key", env.POINTER_CLOUDINARY_API_KEY!);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.POINTER_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    let message = "Cloudinary upload failed";
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error?.message) message = parsed.error.message;
    } catch {}
    throw new Error(`Cloudinary: ${message}`);
  }

  const payload = (await response.json()) as {
    secure_url?: string;
    url?: string;
    bytes: number;
    format?: string;
    public_id: string;
    version?: number;
    asset_id?: string;
    resource_type?: string;
  };

  return {
    url: payload.secure_url ?? payload.url ?? "",
    metadata: {
      size: payload.bytes,
      type: file.type,
      name: file.name,
      format: payload.format ?? null,
      publicId: payload.public_id,
      version: payload.version ?? null,
      assetId: payload.asset_id ?? null,
      provider: "cloudinary",
      resourceType: payload.resource_type ?? resourceType,
    } satisfies Prisma.JsonObject,
  };
}

export async function uploadPhotoToCloudinary({
  file,
  fileName,
}: UploadPhotoInput): Promise<UploadedPhoto> {
  return uploadToCloudinary({
    file,
    fileName,
    resourceType: "image",
    folder: env.POINTER_CLOUDINARY_FOLDER,
  });
}

export async function uploadDocumentToCloudinary({
  file,
  fileName,
}: UploadPhotoInput): Promise<UploadedAsset> {
  return uploadToCloudinary({
    file,
    fileName,
    resourceType: "raw",
    folder: `${env.POINTER_CLOUDINARY_FOLDER}/documents`,
  });
}

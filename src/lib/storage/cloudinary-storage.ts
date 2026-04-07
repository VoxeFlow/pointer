import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { env } from "@/lib/env";
import type { UploadedPhoto } from "@/types/storage";

type UploadPhotoInput = {
  file: File;
  fileName: string;
};

function stripExtension(value: string) {
  const dotIndex = value.lastIndexOf(".");
  return dotIndex > 0 ? value.slice(0, dotIndex) : value;
}

export async function uploadPhotoToCloudinary({
  file,
  fileName,
}: UploadPhotoInput): Promise<UploadedPhoto> {
  if (
    !env.POINTER_CLOUDINARY_CLOUD_NAME ||
    !env.POINTER_CLOUDINARY_API_KEY ||
    !env.POINTER_CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "Cloudinary não configurado. Adicione as chaves POINTER_CLOUDINARY_* no painel da Vercel.",
    );
  }

  const publicId = stripExtension(fileName);
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Parâmetros para assinatura DEVEM estar em ordem alfabética
  const paramsToSign = {
    folder: env.POINTER_CLOUDINARY_FOLDER,
    overwrite: "false",
    public_id: publicId,
    timestamp: String(timestamp),
  };

  const signatureBase = Object.entries(paramsToSign)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const signature = createHash("sha1")
    .update(`${signatureBase}${env.POINTER_CLOUDINARY_API_SECRET}`)
    .digest("hex");

  // Converter File para Base64 (mais seguro para Serverless/Edge)
  const arrayBuffer = await file.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");
  const dataUri = `data:${file.type};base64,${base64Data}`;

  const formData = new FormData();
  formData.append("file", dataUri);
  formData.append("folder", env.POINTER_CLOUDINARY_FOLDER);
  formData.append("public_id", publicId);
  formData.append("overwrite", "false");
  formData.append("api_key", env.POINTER_CLOUDINARY_API_KEY);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.POINTER_CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[CLOUDINARY_UPLOAD_ERROR]", {
      status: response.status,
      body: errorText,
      publicId,
    });
    
    let message = "Cloudinary upload failed";
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      // Ignora erro de parse
    }
    
    throw new Error(`Cloudinary: ${message}`);
  }

  const payload = (await response.json()) as {
    secure_url: string;
    bytes: number;
    format?: string;
    public_id: string;
    version?: number;
    asset_id?: string;
  };

  return {
    url: payload.secure_url,
    metadata: {
      size: payload.bytes,
      type: file.type,
      name: file.name,
      format: payload.format ?? null,
      publicId: payload.public_id,
      version: payload.version ?? null,
      assetId: payload.asset_id ?? null,
      provider: "cloudinary",
    } satisfies Prisma.JsonObject,
  };
}

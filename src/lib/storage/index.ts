import { uploadDocumentToLocal, uploadPhotoToLocal } from "@/lib/storage/local-storage";
import { uploadPhotoToSupabase } from "@/lib/storage/supabase-storage";
import { uploadDocumentToCloudinary, uploadPhotoToCloudinary } from "@/lib/storage/cloudinary-storage";
import { env } from "@/lib/env";
import type { UploadedAsset, UploadedPhoto } from "@/types/storage";

export async function uploadPhoto(file: File, fileName: string): Promise<UploadedPhoto> {
  const hasCloudinary = 
    env.POINTER_CLOUDINARY_CLOUD_NAME && 
    env.POINTER_CLOUDINARY_API_KEY && 
    env.POINTER_CLOUDINARY_API_SECRET;

  // Prioridade 1: Variavel explicita
  if (env.POINTER_STORAGE_DRIVER === "cloudinary" && hasCloudinary) {
    return uploadPhotoToCloudinary({ file, fileName });
  }

  if (env.POINTER_STORAGE_DRIVER === "supabase") {
    return uploadPhotoToSupabase({ file, fileName });
  }

  // Prioridade 2: Fallback automatico se houver chaves do Cloudinary (comum em migracao)
  if (hasCloudinary) {
    return uploadPhotoToCloudinary({ file, fileName });
  }

  // Prioridade 3: Local (apenas para desenvolvimento local)
  return uploadPhotoToLocal({ file, fileName });
}

export async function uploadDocument(file: File, fileName: string): Promise<UploadedAsset> {
  const hasCloudinary =
    env.POINTER_CLOUDINARY_CLOUD_NAME &&
    env.POINTER_CLOUDINARY_API_KEY &&
    env.POINTER_CLOUDINARY_API_SECRET;

  if (env.POINTER_STORAGE_DRIVER === "cloudinary" && hasCloudinary) {
    return uploadDocumentToCloudinary({ file, fileName });
  }

  if (hasCloudinary) {
    return uploadDocumentToCloudinary({ file, fileName });
  }

  return uploadDocumentToLocal({ file, fileName });
}

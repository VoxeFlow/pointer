import { uploadPhotoToLocal } from "@/lib/storage/local-storage";
import { uploadPhotoToSupabase } from "@/lib/storage/supabase-storage";
import { uploadPhotoToCloudinary } from "@/lib/storage/cloudinary-storage";
import { env } from "@/lib/env";
import type { UploadedPhoto } from "@/types/storage";

export async function uploadPhoto(file: File, fileName: string): Promise<UploadedPhoto> {
  if (env.POINTER_STORAGE_DRIVER === "cloudinary") {
    return uploadPhotoToCloudinary({ file, fileName });
  }

  if (env.POINTER_STORAGE_DRIVER === "supabase") {
    return uploadPhotoToSupabase({ file, fileName });
  }

  return uploadPhotoToLocal({ file, fileName });
}

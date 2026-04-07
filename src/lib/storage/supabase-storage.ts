import { env } from "@/lib/env";
import type { UploadedPhoto } from "@/types/storage";

type UploadPhotoInput = {
  file: File;
  fileName: string;
};

export async function uploadPhotoToSupabase({ file, fileName }: UploadPhotoInput): Promise<UploadedPhoto> {
  if (!env.POINTER_SUPABASE_URL || !env.POINTER_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Storage Supabase nao configurado. Use apenas um projeto e bucket exclusivos do Pointer, nunca os do outro sistema.",
    );
  }

  throw new Error(
    "Adapter Supabase reservado para projeto isolado do Pointer. Configure um bucket exclusivo antes de habilitar este driver.",
  );
}

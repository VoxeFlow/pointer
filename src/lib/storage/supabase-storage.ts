import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { UploadedPhoto } from "@/types/storage";

type UploadPhotoInput = {
  file: File;
  fileName: string;
};

export async function uploadPhotoToSupabase({ file, fileName }: UploadPhotoInput): Promise<UploadedPhoto> {
  if (!env.POINTER_SUPABASE_URL || !env.POINTER_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Storage Supabase não configurado. Adicione POINTER_SUPABASE_URL e POINTER_SUPABASE_SERVICE_ROLE_KEY no painel da Vercel.",
    );
  }

  const supabase = createClient(env.POINTER_SUPABASE_URL, env.POINTER_SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
    },
  });

  const { data, error } = await supabase.storage.from(env.POINTER_SUPABASE_BUCKET).upload(fileName, file, {
    contentType: "image/jpeg",
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    console.error("[SUPABASE_STORAGE_ERROR]", error);
    throw new Error(`Falha no upload para o Supabase: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(env.POINTER_SUPABASE_BUCKET).getPublicUrl(data.path);

  return {
    url: publicUrl,
    metadata: {
      path: data.path,
      fullPath: data.fullPath,
      provider: "supabase",
    },
  };
}
